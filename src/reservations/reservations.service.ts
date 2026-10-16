import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AmountOutOfRangeError,
  InsufficientCapacityError,
  InvoiceAlreadyReleasedError,
  ProgramNotFoundError,
  ReservationPayloadConflictError,
  ReservationNotFoundError,
} from '../common/domain-errors.js';
import { CapacityMovementType } from '../database/capacity-movement.entity.js';
import { Program } from '../database/program.entity.js';
import { Reservation } from '../database/reservation.entity.js';
import { convert } from '../fx/convert.js';
import {
  FX_RATE_PROVIDER,
  type FxRateProvider,
} from '../fx/fx-rate-provider.js';
import { ReservationStatus } from './reservation-status.js';
import { ReserveReservationDto } from './reserve-reservation.dto.js';

const POSTGRES_BIGINT_MAX = 9223372036854775807n;

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Program)
    private readonly programs: Repository<Program>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(FX_RATE_PROVIDER)
    private readonly fxRateProvider: FxRateProvider,
  ) {}

  async reserve(
    programId: string,
    request: ReserveReservationDto,
  ): Promise<{ reservation: Reservation; created: boolean }> {
    const program = await this.programs.findOneBy({ id: programId });
    if (!program) {
      throw new ProgramNotFoundError(programId);
    }
    if (BigInt(request.amount) > POSTGRES_BIGINT_MAX) {
      throw new AmountOutOfRangeError();
    }

    const fxRate = await this.fxRateProvider.getRate(
      request.currency,
      program.currency,
    );
    const reservedAmountMinor = convert(
      request.amount,
      request.currency,
      program.currency,
      fxRate,
    );
    if (BigInt(reservedAmountMinor) > POSTGRES_BIGINT_MAX) {
      throw new AmountOutOfRangeError();
    }

    return this.dataSource.transaction(async (manager) => {
      const insertedRows: { id: string }[] = await manager.query(
        `INSERT INTO "reservations" (
          "program_id",
          "invoice_id",
          "original_amount_minor",
          "original_currency",
          "reserved_amount_minor",
          "fx_rate",
          "status"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ("program_id", "invoice_id") DO NOTHING
        RETURNING "id"`,
        [
          program.id,
          request.invoiceId,
          request.amount,
          request.currency,
          reservedAmountMinor,
          fxRate,
          ReservationStatus.RESERVED,
        ],
      );

      if (insertedRows.length === 0) {
        const existing = await manager.findOneBy(Reservation, {
          programId: program.id,
          invoiceId: request.invoiceId,
        });
        if (!existing) {
          throw new ReservationPayloadConflictError();
        }
        if (existing.status === ReservationStatus.RELEASED) {
          throw new InvoiceAlreadyReleasedError();
        }
        if (
          existing.originalAmountMinor !== request.amount ||
          existing.originalCurrency !== request.currency
        ) {
          throw new ReservationPayloadConflictError();
        }

        return { reservation: existing, created: false };
      }

      const [, affectedCount]: [unknown[], number] = await manager.query(
        `UPDATE "programs"
        SET "reserved_minor" = "reserved_minor" + $1::bigint,
            "updated_at" = now()
        WHERE "id" = $2
          AND "reserved_minor"::numeric + $1::numeric <= "limit_minor"::numeric
        RETURNING "id"`,
        [reservedAmountMinor, program.id],
      );
      if (affectedCount === 0) {
        throw new InsufficientCapacityError();
      }

      const reservationId = insertedRows[0].id;
      await manager.query(
        `INSERT INTO "capacity_movements" (
          "program_id",
          "reservation_id",
          "type",
          "amount_minor"
        )
        VALUES ($1, $2, $3, $4)`,
        [
          program.id,
          reservationId,
          CapacityMovementType.RESERVE,
          reservedAmountMinor,
        ],
      );

      const reservation = await manager.findOneByOrFail(Reservation, {
        id: reservationId,
      });
      return { reservation, created: true };
    });
  }

  async release(programId: string, invoiceId: string): Promise<Reservation> {
    return this.dataSource.transaction(async (manager) => {
      const [releasedRows]: [
        { id: string; reserved_amount_minor: string }[],
        number,
      ] = await manager.query(
        `UPDATE "reservations"
        SET "status" = $1,
            "released_at" = now()
        WHERE "program_id" = $2
          AND "invoice_id" = $3
          AND "status" = $4
        RETURNING "id", "reserved_amount_minor"`,
        [
          ReservationStatus.RELEASED,
          programId,
          invoiceId,
          ReservationStatus.RESERVED,
        ],
      );

      if (releasedRows.length === 0) {
        const existing = await manager.findOneBy(Reservation, {
          programId,
          invoiceId,
        });
        if (!existing) {
          throw new ReservationNotFoundError(programId, invoiceId);
        }
        if (existing.status === ReservationStatus.RELEASED) {
          return existing;
        }

        throw new Error(
          `Reservation ${existing.id} could not be released from status ${existing.status}`,
        );
      }

      const { id: reservationId, reserved_amount_minor: amountMinor } =
        releasedRows[0];
      const [, affectedCount]: [unknown[], number] = await manager.query(
        `UPDATE "programs"
        SET "reserved_minor" = "reserved_minor" - $1::bigint,
            "updated_at" = now()
        WHERE "id" = $2
          AND "reserved_minor" >= $1::bigint
        RETURNING "id"`,
        [amountMinor, programId],
      );
      if (affectedCount === 0) {
        throw new Error(
          `Capacity invariant violated while releasing reservation ${reservationId}`,
        );
      }

      await manager.query(
        `INSERT INTO "capacity_movements" (
          "program_id",
          "reservation_id",
          "type",
          "amount_minor"
        )
        VALUES ($1, $2, $3, $4)`,
        [programId, reservationId, CapacityMovementType.RELEASE, amountMinor],
      );

      return manager.findOneByOrFail(Reservation, { id: reservationId });
    });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { CapacityMovementType } from '../database/capacity-movement.entity.js';
import { TreasuryMessageDto, TreasuryMessageType } from './treasury-message.dto.js';
import {
  TreasuryCurrencyMismatchError,
  TreasuryLimitBelowReservedError,
} from './treasury.errors.js';

export enum TreasuryApplyOutcome {
  CREATED = 'CREATED',
  APPLIED = 'APPLIED',
  SKIPPED_STALE = 'SKIPPED_STALE',
}

@Injectable()
export class TreasuryService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  apply(message: TreasuryMessageDto): Promise<TreasuryApplyOutcome> {
    return this.dataSource.transaction(async (manager) => {
      const initialReserved =
        message.type === TreasuryMessageType.RECONCILIATION
          ? message.reservedMinor!
          : '0';
      if (BigInt(initialReserved) > BigInt(message.limitMinor)) {
        throw new TreasuryLimitBelowReservedError(
          message.programId,
          message.messageId,
          message.limitMinor,
          initialReserved,
        );
      }

      const insertedRows: { id: string }[] = await manager.query(
        `INSERT INTO "programs" (
          "id", "currency", "limit_minor", "reserved_minor", "last_treasury_seq"
        )
        VALUES ($1, $2, $3::bigint, $4::bigint, $5::bigint)
        ON CONFLICT ("id") DO NOTHING
        RETURNING "id"`,
        [
          message.programId,
          message.currency,
          message.limitMinor,
          initialReserved,
          message.sequence,
        ],
      );

      if (insertedRows.length > 0) {
        if (BigInt(initialReserved) > 0n) {
          await this.insertReconciliationMovement(
            manager,
            message.programId,
            initialReserved,
          );
        }
        return TreasuryApplyOutcome.CREATED;
      }

      const programs: {
        id: string;
        currency: string;
        limit_minor: string;
        reserved_minor: string;
        last_treasury_seq: string;
      }[] = await manager.query(
        `SELECT "id", "currency", "limit_minor"::text, "reserved_minor"::text,
          "last_treasury_seq"::text
        FROM "programs"
        WHERE "id" = $1
        FOR UPDATE`,
        [message.programId],
      );
      const program = programs[0];
      if (!program) {
        throw new Error(`Program ${message.programId} disappeared during treasury apply`);
      }

      if (program.currency !== message.currency) {
        throw new TreasuryCurrencyMismatchError(
          message.programId,
          message.messageId,
          message.currency,
          program.currency,
          program.reserved_minor,
        );
      }

      if (BigInt(message.sequence) <= BigInt(program.last_treasury_seq)) {
        return TreasuryApplyOutcome.SKIPPED_STALE;
      }

      const nextReserved =
        message.type === TreasuryMessageType.RECONCILIATION
          ? message.reservedMinor!
          : program.reserved_minor;
      if (BigInt(nextReserved) > BigInt(message.limitMinor)) {
        throw new TreasuryLimitBelowReservedError(
          message.programId,
          message.messageId,
          message.limitMinor,
          nextReserved,
        );
      }

      if (message.type === TreasuryMessageType.RECONCILIATION) {
        await manager.query(
          `UPDATE "programs"
          SET "limit_minor" = $1::bigint,
              "reserved_minor" = $2::bigint,
              "last_treasury_seq" = $3::bigint,
              "updated_at" = now()
          WHERE "id" = $4`,
          [message.limitMinor, nextReserved, message.sequence, message.programId],
        );

        const delta = BigInt(nextReserved) - BigInt(program.reserved_minor);
        if (delta !== 0n) {
          await this.insertReconciliationMovement(
            manager,
            message.programId,
            delta.toString(),
          );
        }
      } else {
        await manager.query(
          `UPDATE "programs"
          SET "limit_minor" = $1::bigint,
              "last_treasury_seq" = $2::bigint,
              "updated_at" = now()
          WHERE "id" = $3`,
          [message.limitMinor, message.sequence, message.programId],
        );
      }

      return TreasuryApplyOutcome.APPLIED;
    });
  }

  private insertReconciliationMovement(
    manager: EntityManager,
    programId: string,
    amountMinor: string,
  ): Promise<unknown> {
    return manager.query(
      `INSERT INTO "capacity_movements" (
        "program_id", "reservation_id", "type", "amount_minor"
      )
      VALUES ($1, NULL, $2, $3::bigint)`,
      [programId, CapacityMovementType.RECONCILE, amountMinor],
    );
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatus } from './reservation-status.js';
import type { Reservation } from '../database/reservation.entity.js';

export class ReservationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  programId: string;

  @ApiProperty({ maxLength: 255 })
  invoiceId: string;

  @ApiProperty({
    description: 'Original amount in minor currency units.',
    example: '125000',
  })
  originalAmountMinor: string;

  @ApiProperty({ example: 'EUR' })
  originalCurrency: string;

  @ApiProperty({
    description: 'Reserved amount in the program currency minor units.',
    example: '135870',
  })
  reservedAmountMinor: string;

  @ApiProperty({
    description: 'FX rate from original currency to program currency.',
    example: '1.086956521739',
  })
  fxRate: string;

  @ApiProperty({ enum: ReservationStatus, enumName: 'ReservationStatus' })
  status: ReservationStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  releasedAt: string | null;

  static fromEntity(reservation: Reservation): ReservationResponseDto {
    return {
      id: reservation.id,
      programId: reservation.programId,
      invoiceId: reservation.invoiceId,
      originalAmountMinor: reservation.originalAmountMinor,
      originalCurrency: reservation.originalCurrency,
      reservedAmountMinor: reservation.reservedAmountMinor,
      fxRate: reservation.fxRate,
      status: reservation.status,
      releasedAt: reservation.releasedAt?.toISOString() ?? null,
    };
  }
}

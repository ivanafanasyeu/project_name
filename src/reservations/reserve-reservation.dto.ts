import { ApiProperty } from '@nestjs/swagger';
import {
  IsISO4217CurrencyCode,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ReserveReservationDto {
  @ApiProperty({
    example: 'invoice-2026-0042',
    maxLength: 255,
    pattern: '^[A-Za-z0-9._:-]+$',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  invoiceId: string;

  @ApiProperty({
    example: '125000',
    description:
      'Positive integer in minor currency units, represented as a string.',
  })
  @IsString()
  @Matches(/^[1-9]\d*$/)
  @MaxLength(19)
  amount: string;

  @ApiProperty({ example: 'USD', pattern: '^[A-Z]{3}$' })
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  @IsISO4217CurrencyCode()
  currency: string;
}

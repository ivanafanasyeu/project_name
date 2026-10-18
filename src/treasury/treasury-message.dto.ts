import { plainToInstance } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsISO4217CurrencyCode,
  IsString,
  Matches,
  MaxLength,
  IsUUID,
  ValidateIf,
  validate,
} from 'class-validator';
import { isSupportedCurrency } from '../fx/convert.js';

const POSTGRES_BIGINT_MAX = 9223372036854775807n;

export enum TreasuryMessageType {
  RECONCILIATION = 'RECONCILIATION',
  CAPACITY_UPDATE = 'CAPACITY_UPDATE',
}

export class TreasuryMessageDto {
  @IsUUID()
  messageId: string;

  @IsIn(Object.values(TreasuryMessageType))
  type: TreasuryMessageType;

  @IsUUID()
  programId: string;

  @IsString()
  @Matches(/^[1-9]\d*$/)
  @MaxLength(19)
  sequence: string;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  @IsISO4217CurrencyCode()
  currency: string;

  @IsString()
  @Matches(/^(0|[1-9]\d*)$/)
  @MaxLength(19)
  limitMinor: string;

  @ValidateIf((_message, value) => typeof value === 'string')
  @IsString()
  @Matches(/^(0|[1-9]\d*)$/)
  @MaxLength(19)
  reservedMinor?: string;

  @IsDateString()
  sentAt: string;
}

export class TreasuryMessageValidationError extends Error {
  constructor(readonly details: string[]) {
    super(details.join('; '));
    this.name = TreasuryMessageValidationError.name;
  }
}

export async function validateTreasuryMessage(
  payload: unknown,
  key: string | Buffer | null | undefined,
): Promise<TreasuryMessageDto> {
  let value = payload;
  if (Buffer.isBuffer(value)) {
    try {
      value = JSON.parse(value.toString());
    } catch {
      throw new TreasuryMessageValidationError(['payload must be a JSON object']);
    }
  }

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TreasuryMessageValidationError(['payload must be an object']);
  }

  const message = plainToInstance(TreasuryMessageDto, value);
  const errors = await validate(message, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const details = errors.flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );
  const payloadRecord = value as Record<string, unknown>;
  const hasReservedMinor = Object.hasOwn(value, 'reservedMinor');

  if (hasReservedMinor && typeof payloadRecord.reservedMinor !== 'string') {
    details.push('reservedMinor must be a string when present');
  }

  if (isBigintString(message.sequence) && BigInt(message.sequence) > POSTGRES_BIGINT_MAX) {
    details.push('sequence exceeds PostgreSQL BIGINT');
  }
  if (isBigintString(message.limitMinor) && BigInt(message.limitMinor) > POSTGRES_BIGINT_MAX) {
    details.push('limitMinor exceeds PostgreSQL BIGINT');
  }
  if (
    isBigintString(message.reservedMinor) &&
    BigInt(message.reservedMinor!) > POSTGRES_BIGINT_MAX
  ) {
    details.push('reservedMinor exceeds PostgreSQL BIGINT');
  }
  if (typeof message.currency === 'string' && !isSupportedCurrency(message.currency)) {
    details.push('currency is not supported');
  }
  if (
    message.type === TreasuryMessageType.RECONCILIATION &&
    !hasReservedMinor
  ) {
    details.push('reservedMinor is required for RECONCILIATION');
  }
  if (
    message.type === TreasuryMessageType.CAPACITY_UPDATE &&
    hasReservedMinor
  ) {
    details.push('reservedMinor must be absent for CAPACITY_UPDATE');
  }
  if (key === null || key === undefined || key.toString() === '') {
    details.push('Kafka message key is required');
  } else if (
    typeof message.programId === 'string' &&
    key.toString() !== message.programId
  ) {
    details.push('Kafka message key must match programId');
  }

  if (details.length > 0) {
    throw new TreasuryMessageValidationError(details);
  }

  return message;
}

function isBigintString(value: string | undefined): boolean {
  return typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
}

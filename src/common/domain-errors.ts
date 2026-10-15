export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnsupportedCurrencyError extends DomainError {
  constructor(fromCurrency: string, toCurrency: string) {
    super(
      `Unsupported currency conversion: ${fromCurrency} to ${toCurrency}`,
      'UNSUPPORTED_CURRENCY',
      422,
    );
  }
}

export class InvalidFxRateError extends DomainError {
  constructor() {
    super(
      'FX rate is invalid or cannot be represented',
      'INVALID_FX_RATE',
      502,
    );
  }
}

export class ProgramNotFoundError extends DomainError {
  constructor(programId: string) {
    super(`Program ${programId} not found`, 'PROGRAM_NOT_FOUND', 404);
  }
}

export class ReservationPayloadConflictError extends DomainError {
  constructor() {
    super(
      'This invoice already has a reservation with a different amount or currency',
      'RESERVATION_PAYLOAD_CONFLICT',
      409,
    );
  }
}

export class InsufficientCapacityError extends DomainError {
  constructor() {
    super('Insufficient program capacity', 'INSUFFICIENT_CAPACITY', 422);
  }
}

export class AmountOutOfRangeError extends DomainError {
  constructor() {
    super(
      'Amount cannot be represented as a PostgreSQL BIGINT',
      'AMOUNT_OUT_OF_RANGE',
      422,
    );
  }
}

export class TreasuryCurrencyMismatchError extends Error {
  constructor(
    readonly programId: string,
    readonly messageId: string,
    readonly messageCurrency: string,
    readonly currentCurrency: string,
    readonly currentReservedMinor: string,
  ) {
    super(
      `Program ${programId} currency is ${currentCurrency}, not ${messageCurrency}`,
    );
    this.name = TreasuryCurrencyMismatchError.name;
  }
}

export class TreasuryLimitBelowReservedError extends Error {
  constructor(
    readonly programId: string,
    readonly messageId: string,
    readonly limitMinor: string,
    readonly reservedMinor: string,
  ) {
    super(
      `Program ${programId} limit ${limitMinor} is below reserved amount ${reservedMinor}`,
    );
    this.name = TreasuryLimitBelowReservedError.name;
  }
}

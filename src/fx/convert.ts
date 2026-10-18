import {
  InvalidFxRateError,
  UnsupportedCurrencyError,
} from '../common/domain-errors.js';

const currencyExponents: Readonly<Record<string, number>> = {
  USD: 2,
  EUR: 2,
  JPY: 0,
  KWD: 3,
};

export function isSupportedCurrency(currency: string): boolean {
  return currencyExponents[currency] !== undefined;
}

function parseRate(rate: string): { numerator: bigint; denominator: bigint } {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(rate);
  if (!match) {
    throw new InvalidFxRateError();
  }

  const integerDigits = match[1].replace(/^0+/, '').length;
  const fraction = match[2] ?? '';
  if (integerDigits > 18 || fraction.length > 12) {
    throw new InvalidFxRateError();
  }

  const denominator = 10n ** BigInt(fraction.length);
  const numerator = BigInt(match[1] + fraction);
  if (numerator <= 0n) {
    throw new InvalidFxRateError();
  }

  return { numerator, denominator };
}

export function convert(
  amountMinor: string,
  fromCurrency: string,
  toCurrency: string,
  rate: string,
): string {
  const sourceExponent = currencyExponents[fromCurrency];
  const targetExponent = currencyExponents[toCurrency];
  if (sourceExponent === undefined || targetExponent === undefined) {
    throw new UnsupportedCurrencyError(fromCurrency, toCurrency);
  }
  if (!/^[1-9]\d*$/.test(amountMinor)) {
    throw new RangeError('Amount must be a positive integer string');
  }

  const { numerator: rateNumerator, denominator: rateDenominator } =
    parseRate(rate);
  const numerator =
    BigInt(amountMinor) * rateNumerator * 10n ** BigInt(targetExponent);
  const denominator = rateDenominator * 10n ** BigInt(sourceExponent);

  return ((numerator + denominator - 1n) / denominator).toString();
}

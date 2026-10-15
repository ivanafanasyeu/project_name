export const FX_RATE_PROVIDER = Symbol('FX_RATE_PROVIDER');

export interface FxRateProvider {
  getRate(fromCurrency: string, toCurrency: string): Promise<string>;
}

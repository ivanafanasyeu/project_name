import { Injectable } from '@nestjs/common';
import { UnsupportedCurrencyError } from '../common/domain-errors.js';
import type { FxRateProvider } from './fx-rate-provider.js';

const rates: Readonly<Record<string, string>> = {
  'USD:EUR': '0.92',
  'EUR:USD': '1.086956521739',
  'USD:JPY': '150',
  'JPY:USD': '0.006666666667',
  'USD:KWD': '0.307692307692',
  'KWD:USD': '3.25',
  'EUR:JPY': '163.043478260870',
  'JPY:EUR': '0.006133333333',
  'EUR:KWD': '0.334769230769',
  'KWD:EUR': '2.986833333333',
  'JPY:KWD': '0.002051282051',
  'KWD:JPY': '487.5',
};

@Injectable()
export class StaticFxRateProvider implements FxRateProvider {
  async getRate(fromCurrency: string, toCurrency: string): Promise<string> {
    if (fromCurrency === toCurrency) {
      return '1';
    }

    const rate = rates[`${fromCurrency}:${toCurrency}`];
    if (rate === undefined) {
      throw new UnsupportedCurrencyError(fromCurrency, toCurrency);
    }

    return rate;
  }
}

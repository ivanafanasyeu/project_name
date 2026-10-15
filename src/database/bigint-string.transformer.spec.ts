import { describe, expect, it } from 'vitest';
import { bigintStringTransformer } from './bigint-string.transformer.js';

describe('bigintStringTransformer', () => {
  it('preserves BIGINT values beyond JavaScript safe integer precision', () => {
    const amount = '900719925474099312345';

    expect(bigintStringTransformer.to(amount)).toBe(amount);
    expect(bigintStringTransformer.from(amount)).toBe(amount);
  });
});

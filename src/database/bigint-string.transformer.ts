import type { ValueTransformer } from 'typeorm';

export type BigintString = string;

export const bigintStringTransformer: ValueTransformer = {
  to(value: BigintString): string {
    return value;
  },
  from(value: string | number): BigintString {
    return String(value);
  },
};

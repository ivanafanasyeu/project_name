import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import {
  bigintStringTransformer,
  type BigintString,
} from './bigint-string.transformer.js';

@Entity({ name: 'programs' })
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({
    name: 'limit_minor',
    type: 'bigint',
    transformer: bigintStringTransformer,
  })
  limitMinor: BigintString;

  @Column({
    name: 'reserved_minor',
    type: 'bigint',
    default: '0',
    transformer: bigintStringTransformer,
  })
  reservedMinor: BigintString;

  @Column({
    name: 'last_treasury_seq',
    type: 'bigint',
    default: '0',
    transformer: bigintStringTransformer,
  })
  lastTreasurySeq: BigintString;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

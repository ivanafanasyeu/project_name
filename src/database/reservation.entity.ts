import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Program } from './program.entity.js';
import {
  bigintStringTransformer,
  type BigintString,
} from './bigint-string.transformer.js';
import { ReservationStatus } from '../reservations/reservation-status.js';

@Unique('UQ_reservations_program_invoice', ['programId', 'invoiceId'])
@Entity({ name: 'reservations' })
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'program_id', type: 'uuid' })
  programId: string;

  @ManyToOne(() => Program, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'program_id' })
  program: Program;

  @Column({ name: 'invoice_id', type: 'varchar', length: 255 })
  invoiceId: string;

  @Column({
    name: 'original_amount_minor',
    type: 'bigint',
    transformer: bigintStringTransformer,
  })
  originalAmountMinor: BigintString;

  @Column({ name: 'original_currency', type: 'varchar', length: 3 })
  originalCurrency: string;

  @Column({
    name: 'reserved_amount_minor',
    type: 'bigint',
    transformer: bigintStringTransformer,
  })
  reservedAmountMinor: BigintString;

  @Column({ name: 'fx_rate', type: 'numeric', precision: 30, scale: 12 })
  fxRate: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    enumName: 'reservations_status_enum',
  })
  status: ReservationStatus;

  @Column({ name: 'released_at', type: 'timestamptz', nullable: true })
  releasedAt: Date | null;
}

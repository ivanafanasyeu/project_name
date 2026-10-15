import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Program } from './program.entity.js';
import { Reservation } from './reservation.entity.js';
import {
  bigintStringTransformer,
  type BigintString,
} from './bigint-string.transformer.js';

export enum CapacityMovementType {
  RESERVE = 'RESERVE',
  RELEASE = 'RELEASE',
}

@Entity({ name: 'capacity_movements' })
export class CapacityMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'program_id', type: 'uuid' })
  programId: string;

  @ManyToOne(() => Program, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'program_id' })
  program: Program;

  @Column({ name: 'reservation_id', type: 'uuid' })
  reservationId: string;

  @ManyToOne(() => Reservation, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reservation_id' })
  reservation: Reservation;

  @Column({
    type: 'enum',
    enum: CapacityMovementType,
    enumName: 'capacity_movements_type_enum',
  })
  type: CapacityMovementType;

  @Column({
    name: 'amount_minor',
    type: 'bigint',
    transformer: bigintStringTransformer,
  })
  amountMinor: BigintString;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

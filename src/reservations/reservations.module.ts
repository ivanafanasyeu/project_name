import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CapacityMovement } from '../database/capacity-movement.entity.js';
import { Program } from '../database/program.entity.js';
import { Reservation } from '../database/reservation.entity.js';
import { FX_RATE_PROVIDER } from '../fx/fx-rate-provider.js';
import { StaticFxRateProvider } from '../fx/static-fx-rate.provider.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Program, Reservation, CapacityMovement])],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    StaticFxRateProvider,
    { provide: FX_RATE_PROVIDER, useExisting: StaticFxRateProvider },
  ],
})
export class ReservationsModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { DomainExceptionFilter } from './common/domain-exception.filter.js';
import { DatabaseModule } from './database/database.module.js';
import { ProgramsModule } from './programs/programs.module.js';
import { ReservationsModule } from './reservations/reservations.module.js';
import { TreasuryModule } from './treasury/treasury.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    ProgramsModule,
    ReservationsModule,
    TreasuryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}

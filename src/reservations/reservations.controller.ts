import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReservationResponseDto } from './reservation-response.dto.js';
import { ReserveReservationDto } from './reserve-reservation.dto.js';
import { ReservationsService } from './reservations.service.js';

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('programs/:programId/reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    description: 'Reservation created',
    type: ReservationResponseDto,
  })
  @ApiOkResponse({
    description: 'Idempotent reservation replay',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Program not found' })
  @ApiConflictResponse({
    description: 'Invoice already reserved with another payload',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Unsupported currency or insufficient program capacity',
  })
  async reserve(
    @Param('programId', new ParseUUIDPipe()) programId: string,
    @Body() request: ReserveReservationDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReservationResponseDto> {
    const result = await this.reservationsService.reserve(programId, request);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    const reservation = result.reservation;
    return {
      id: reservation.id,
      programId: reservation.programId,
      invoiceId: reservation.invoiceId,
      originalAmountMinor: reservation.originalAmountMinor,
      originalCurrency: reservation.originalCurrency,
      reservedAmountMinor: reservation.reservedAmountMinor,
      fxRate: reservation.fxRate,
      status: reservation.status,
      releasedAt: reservation.releasedAt?.toISOString() ?? null,
    };
  }
}

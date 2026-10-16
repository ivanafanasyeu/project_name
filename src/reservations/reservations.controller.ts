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
    description:
      'Invoice is already released or already reserved with another payload',
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
    return ReservationResponseDto.fromEntity(result.reservation);
  }

  @Post(':invoiceId/release')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Reservation released or release replayed',
    type: ReservationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Reservation not found' })
  async release(
    @Param('programId', new ParseUUIDPipe()) programId: string,
    @Param('invoiceId') invoiceId: string,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.reservationsService.release(
      programId,
      invoiceId,
    );
    return ReservationResponseDto.fromEntity(reservation);
  }
}

import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProgramsService } from './programs.service.js';

@ApiTags('programs')
@ApiBearerAuth()
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get(':id/capacity')
  getCapacity(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.programsService.getCapacity(id);
  }
}

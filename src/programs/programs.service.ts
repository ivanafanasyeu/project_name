import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Program } from '../database/program.entity.js';

@Injectable()
export class ProgramsService {
  constructor(
    @InjectRepository(Program)
    private readonly programs: Repository<Program>,
  ) {}

  async getCapacity(id: string) {
    const program = await this.programs.findOne({ where: { id } });
    if (!program) {
      throw new NotFoundException(`Program ${id} not found`);
    }

    return {
      programId: program.id,
      currency: program.currency,
      limitMinor: program.limitMinor,
      reservedMinor: program.reservedMinor,
      availableMinor: (
        BigInt(program.limitMinor) - BigInt(program.reservedMinor)
      ).toString(),
    };
  }
}

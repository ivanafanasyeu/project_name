import dataSource from './data-source.js';
import { Program } from './program.entity.js';

const seedProgramId = '00000000-0000-4000-8000-000000000001';
const seedLimitMinor = '1000000000';

async function seed() {
  await dataSource.initialize();

  try {
    const programs = dataSource.getRepository(Program);
    let program = await programs.findOneBy({ id: seedProgramId });

    if (!program) {
      program = await programs.save(
        programs.create({
          id: seedProgramId,
          currency: 'USD',
          limitMinor: seedLimitMinor,
          reservedMinor: '0',
          lastTreasurySeq: '0',
        }),
      );
    }

    console.log(`Seeded program: ${program.id}`);
  } finally {
    await dataSource.destroy();
  }
}

await seed();

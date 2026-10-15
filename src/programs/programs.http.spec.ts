import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from '../auth/auth.module.js';
import { ProgramsController } from './programs.controller.js';
import { ProgramsService } from './programs.service.js';

describe('Programs capacity route', () => {
  let app: INestApplication;
  const programId = '00000000-0000-4000-8000-000000000001';
  const capacity = {
    programId,
    currency: 'USD',
    limitMinor: '1000000000',
    reservedMinor: '0',
    availableMinor: '1000000000',
  };
  const programsService = {
    getCapacity: vi.fn().mockResolvedValue(capacity),
  };
  const authConfig = {
    JWT_MODE: 'dev',
    JWT_SECRET: 'programs-http-test-secret',
    JWT_ISSUER: 'programs-test-issuer',
    JWT_AUDIENCE: 'programs-test-audience',
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => authConfig],
        }),
        AuthModule,
      ],
      controllers: [ProgramsController],
      providers: [{ provide: ProgramsService, useValue: programsService }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .get(`/programs/${programId}/capacity`)
      .expect(401);
  });

  it('returns capacity to an authenticated caller', async () => {
    const token = await app
      .get(JwtService)
      .signAsync({ sub: 'capacity-client' });

    await request(app.getHttpServer())
      .get(`/programs/${programId}/capacity`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(capacity);

    expect(programsService.getCapacity).toHaveBeenCalledWith(programId);
  });
});

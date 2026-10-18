import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthModule } from './auth.module.js';
import { AppController } from '../app.controller.js';
import { AppService } from '../app.service.js';

describe('Auth routes', () => {
  let app: INestApplication;
  const authConfig = {
    JWT_MODE: 'dev',
    JWT_SECRET: 'test-secret-for-http-suite',
    JWT_ISSUER: 'test-issuer',
    JWT_AUDIENCE: 'test-audience',
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
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['/health'])('keeps %s public', async (path) => {
    await request(app.getHttpServer())
      .get(path)
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('rejects anonymous requests to the protected endpoint', async () => {
    await request(app.getHttpServer()).get('/auth/protected').expect(401);
  });

  it('does not expose a local token issuance endpoint', async () => {
    await request(app.getHttpServer()).post('/auth/token').expect(404);
  });

  it('rejects authenticated requests without the required scope', async () => {
    const token = await app.get(JwtService).signAsync({
      sub: 'scope-test-client',
      scope: 'api:write',
    });

    await request(app.getHttpServer())
      .get('/auth/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});

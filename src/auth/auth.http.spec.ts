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
    JWT_SCOPES: 'api:read',
    CLIENT_ID: 'http-test-client',
    CLIENT_SECRET: 'http-test-secret',
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

  it('issues a dev token and authorizes requests with the required scope', async () => {
    const tokenResponse = await request(app.getHttpServer())
      .post('/auth/token')
      .send({
        client_id: authConfig.CLIENT_ID,
        client_secret: authConfig.CLIENT_SECRET,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/auth/protected')
      .set('Authorization', `Bearer ${tokenResponse.body.access_token}`)
      .expect(200)
      .expect({
        authenticated: true,
        clientId: authConfig.CLIENT_ID,
        scopes: ['api:read'],
      });
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

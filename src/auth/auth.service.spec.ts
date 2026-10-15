import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const config = new ConfigService({
    JWT_MODE: 'dev',
    JWT_SECRET: 'test-signing-secret',
    JWT_ISSUER: 'test-issuer',
    JWT_AUDIENCE: 'test-audience',
    JWT_SCOPES: 'api:read api:write',
    CLIENT_ID: 'test-client',
    CLIENT_SECRET: 'test-client-secret',
  });
  const jwtService = new JwtService({
    secret: 'test-signing-secret',
    signOptions: {
      algorithm: 'HS256',
      issuer: 'test-issuer',
      audience: 'test-audience',
      expiresIn: 900,
    },
  });
  const authService = new AuthService(config, jwtService);

  it('issues a signed token for valid dev client credentials', async () => {
    const result = await authService.issueDevToken(
      'test-client',
      'test-client-secret',
    );
    const payload = await jwtService.verifyAsync(result.access_token, {
      algorithms: ['HS256'],
    });

    expect(result.token_type).toBe('Bearer');
    expect(payload.sub).toBe('test-client');
    expect(payload.scope).toBe('api:read api:write');
    expect(payload.iss).toBe('test-issuer');
    expect(payload.aud).toBe('test-audience');
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('rejects invalid client credentials', async () => {
    await expect(
      authService.issueDevToken('test-client', 'wrong-secret'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('disables local token issuance outside dev mode', async () => {
    const productionService = new AuthService(
      new ConfigService({ JWT_MODE: 'jwks' }),
      jwtService,
    );

    await expect(
      productionService.issueDevToken('test-client', 'test-client-secret'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not enable dev mode in production', async () => {
    const productionService = new AuthService(
      new ConfigService({ NODE_ENV: 'production' }),
      jwtService,
    );

    await expect(
      productionService.issueDevToken('test-client', 'test-client-secret'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
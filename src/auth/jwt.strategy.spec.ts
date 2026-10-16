import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  const strategy = new JwtStrategy(
    new ConfigService({
      JWT_MODE: 'dev',
      JWT_SECRET: 'test-secret',
      JWT_ISSUER: 'test-issuer',
      JWT_AUDIENCE: 'test-audience',
    }),
  );
  const validPayload = {
    iss: 'test-issuer',
    aud: 'test-audience',
    exp: Math.floor(Date.now() / 1000) + 60,
    sub: 'test-client',
    scope: 'api:read api:write',
  };

  it('normalizes scopes from a valid token', () => {
    expect(strategy.validate(validPayload)).toEqual({
      sub: 'test-client',
      clientId: 'test-client',
      scopes: ['api:read', 'api:write'],
    });
  });

  it.each([
    ['issuer', { iss: 'other-issuer' }],
    ['audience', { aud: 'other-audience' }],
    ['expiry', { exp: Math.floor(Date.now() / 1000) - 1 }],
    ['scope shape', { scope: 42 }],
  ])('rejects an invalid %s claim', (_claim, override) => {
    expect(() => strategy.validate({ ...validPayload, ...override })).toThrow(
      UnauthorizedException,
    );
  });
});

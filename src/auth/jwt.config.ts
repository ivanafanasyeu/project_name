import { ConfigService } from '@nestjs/config';

export const DEV_JWT_SECRET = 'local-development-only-change-me';

export function getJwtMode(config: ConfigService) {
  const isProduction = config.get('NODE_ENV') === 'production';
  const mode = config.get('JWT_MODE', isProduction ? 'jwks' : 'dev');
  if (mode !== 'dev' && mode !== 'jwks') {
    throw new Error('JWT_MODE must be "dev" or "jwks"');
  }
  if (isProduction && mode !== 'jwks') {
    throw new Error('JWT_MODE=jwks is required in production');
  }
  return mode;
}

export function getJwtSettings(config: ConfigService) {
  const mode = getJwtMode(config);

  const jwksUri = config.get<string>('JWT_JWKS_URI');
  if (mode === 'jwks' && !jwksUri) {
    throw new Error('JWT_JWKS_URI is required when JWT_MODE=jwks');
  }

  return {
    mode,
    issuer: config.get('JWT_ISSUER', 'http://localhost:3000'),
    audience: config.get('JWT_AUDIENCE', 'project-api'),
    secret: config.get('JWT_SECRET', DEV_JWT_SECRET),
    jwksUri,
  } as const;
}
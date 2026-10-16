import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { StrategyOptions } from 'passport-jwt';
import { getJwtSettings } from './jwt.config.js';
import type { AuthenticatedUser } from './auth.types.js';

interface JwtPayload {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  sub?: string;
  client_id?: string;
  scope?: unknown;
  scp?: unknown;
  scopes?: unknown;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly config: ConfigService;

  constructor(config: ConfigService) {
    const settings = getJwtSettings(config);
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer: settings.issuer,
      audience: settings.audience,
      algorithms: [settings.mode === 'dev' ? 'HS256' : 'RS256'],
      ignoreExpiration: false,
      ...(settings.mode === 'dev'
        ? { secretOrKey: settings.secret }
        : {
            secretOrKeyProvider: passportJwtSecret({
              cache: true,
              rateLimit: true,
              jwksRequestsPerMinute: 5,
              jwksUri: settings.jwksUri!,
            }),
          }),
    };

    super(options);
    this.config = config;
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    const settings = getJwtSettings(this.config);
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (
      payload.iss !== settings.issuer ||
      !audiences.includes(settings.audience) ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0
    ) {
      throw new UnauthorizedException('Invalid token claims');
    }

    const rawScopes = payload.scope ?? payload.scp ?? payload.scopes;
    let scopes: string[] = [];
    if (typeof rawScopes === 'string') {
      scopes = rawScopes.split(/\s+/).filter(Boolean);
    } else if (
      Array.isArray(rawScopes) &&
      rawScopes.every((scope) => typeof scope === 'string')
    ) {
      scopes = rawScopes;
    } else if (rawScopes !== undefined) {
      throw new UnauthorizedException('Invalid token scopes');
    }

    return {
      sub: payload.sub,
      clientId:
        typeof payload.client_id === 'string' ? payload.client_id : payload.sub,
      scopes,
    };
  }
}

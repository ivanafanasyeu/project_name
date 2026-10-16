import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'node:crypto';
import { getJwtMode } from './jwt.config.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async issueDevToken(clientId: unknown, clientSecret: unknown) {
    if (getJwtMode(this.config) !== 'dev') {
      throw new NotFoundException();
    }

    const expectedClientId = this.config.get('CLIENT_ID', 'local-client');
    const expectedClientSecret = this.config.get(
      'CLIENT_SECRET',
      'local-client-secret',
    );
    if (
      typeof clientId !== 'string' ||
      typeof clientSecret !== 'string' ||
      !secureEqual(clientId, expectedClientId) ||
      !secureEqual(clientSecret, expectedClientSecret)
    ) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: clientId,
      client_id: clientId,
      scope: this.config.get('JWT_SCOPES', 'api:read'),
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 900,
    };
  }
}

function secureEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

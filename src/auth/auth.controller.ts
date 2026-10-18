import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Scopes } from './scopes.decorator.js';
import type { AuthenticatedRequest } from './auth.types.js';

@Controller('auth')
export class AuthController {
  @Get('protected')
  @ApiBearerAuth()
  @Scopes('api:read')
  getProtected(@Req() request: AuthenticatedRequest) {
    return {
      authenticated: true,
      clientId: request.user.clientId,
      scopes: request.user.scopes,
    };
  }
}

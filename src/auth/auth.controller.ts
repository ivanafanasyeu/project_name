import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';
import { Scopes } from './scopes.decorator.js';
import type { AuthenticatedRequest } from './auth.types.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  @Public()
  issueDevToken(
    @Body() body: { client_id?: unknown; client_secret?: unknown },
  ) {
    return this.authService.issueDevToken(body?.client_id, body?.client_secret);
  }

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

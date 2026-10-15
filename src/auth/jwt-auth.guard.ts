import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { REQUIRED_SCOPES_KEY } from './scopes.decorator.js';
import type { AuthenticatedRequest } from './auth.types.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) return false;

    const requiredScopes =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!requiredScopes.every((scope) => request.user.scopes.includes(scope))) {
      throw new ForbiddenException('Insufficient scope');
    }

    return true;
  }
}
import type { Request } from 'express';

export interface AuthenticatedUser {
  sub: string;
  clientId: string;
  scopes: string[];
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };

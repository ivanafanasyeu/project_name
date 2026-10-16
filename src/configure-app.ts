import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

export function configureApp(app: INestApplication): void {
  const defaultHelmet = helmet();
  const swaggerHelmet = helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", 'https:', "'unsafe-inline'"],
      },
    },
  });

  app.use((request: Request, response: Response, next: NextFunction) => {
    const isSwaggerUiRoute =
      process.env.NODE_ENV !== 'production' &&
      (request.path === '/api' || request.path.startsWith('/api/'));
    const selectedHelmet = isSwaggerUiRoute ? swaggerHelmet : defaultHelmet;
    selectedHelmet(request, response, next);
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
}

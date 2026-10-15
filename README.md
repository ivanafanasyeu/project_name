# Task

Program Capacity & Invoice Reservation
A financing program has a total credit limit (e.g. $10,000,000). When an invoice is approved for
early payment, it reserves a portion of that capacity. When repaid, the amount is released back.

Your task is to implement a module that tracks this in real time — accepting reservations,
processing releases, and exposing current availability to clients.

Capacity data also flows in from an external treasury system via Kafka, including periodic bulk
reconciliation messages that bring a program's full state up to date. Programs and invoices may
be denominated in different currencies.

All endpoints must be authenticated. The service should be runnable locally. Treat this as
production code — if you make assumptions or trade-offs, document them briefly.

## Project setup

```bash
$ pnpm install
```

## PostgreSQL

Start the local database with Docker Compose:

```bash
$ docker compose up -d
```

The Nest app connects to `localhost:5432` using the `project_name` database and
the `postgres` user/password by default. Override these with `DB_HOST`,
`DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD`. Schema synchronization
is disabled by default; set `DB_SYNCHRONIZE=true` for local development when
using TypeORM entities.

## Authentication

Copy `.env.example` to `.env` and set a local `JWT_SECRET`, `CLIENT_ID`, and
`CLIENT_SECRET`. Start the database and app, then request a development token:

```bash
$ cp .env.example .env
$ make up-db
$ pnpm run start:dev
$ make token
```

Use the printed token as a bearer token for `/auth/protected`; it requires the
`api:read` scope. `/health` is public.

For production, set `JWT_MODE=jwks`, `JWT_JWKS_URI`, `JWT_ISSUER`, and
`JWT_AUDIENCE`. Local token issuance is disabled in this mode, and the guard
accepts only RS256 tokens verified against the configured JWKS.

## Compile and run the project

The Swagger UI is available at `http://localhost:3000/api` while the app is running.
Use **Authorize** to enter a bearer token for protected endpoints. The OpenAPI document
is available at `http://localhost:3000/api-json`.

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```
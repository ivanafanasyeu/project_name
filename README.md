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
is disabled; schema changes are applied only through migrations. After starting
PostgreSQL, apply pending migrations with:

```bash
$ pnpm run migration:run
```

Generate migrations against the running database after changing entity metadata:

```bash
$ pnpm run migration:generate -- src/database/migrations/DescribeChange
```

Generate and apply one logical table change at a time. CHECK constraints are
intentionally defined in migrations rather than entity metadata, so review
generated migrations to ensure they preserve constraints from earlier migrations.
BIGINT monetary amounts and treasury sequence values are decimal strings in
TypeScript. FX rates use `NUMERIC(30,12)` and are represented as strings. Invoice
IDs are stored as `VARCHAR(255)`. The append-only journal blocks updates, deletes,
and truncation. Its movement enum currently supports `RESERVE` and `RELEASE`;
`RECONCILE` requires a future migration.

## Authentication, Seeding data, FX rates

Copy `.env.example` to `.env` and set a local `JWT_SECRET`. Start the database
and app:

```bash
$ cp .env.example .env
$ make up-db
$ pnpm run migration:run
$ pnpm run seed
$ pnpm run start:dev
$ make token
```

`00000000-0000-4000-8000-000000000001` - seed reservation ID

`make token` prints a local development JWT without making an HTTP token request.
scope. `/health` is public. The seed command creates a USD program
with a $10,000,000 limit (1,000,000,000 cents) and prints its ID.

Create a reservation using the same token:

```bash
$ curl -X POST http://localhost:3000/programs/00000000-0000-4000-8000-000000000001/reservations \
	-H "Authorization: Bearer $TOKEN" \
	-H "Content-Type: application/json" \
	-d '{"invoiceId":"invoice-001","amount":"125000","currency":"EUR"}'
```

The bundled FX provider uses fixed example rates, not live market quotes. Replace
the `FX_RATE_PROVIDER` binding with an external provider before production use.
Invoice IDs accept only ASCII letters, digits, `.`, `_`, `:`, and `-`. An invoice
can be reserved once per program; attempting to reserve it again after release
returns `409 INVOICE_ALREADY_RELEASED`.

For production, set `JWT_MODE=jwks`, `JWT_JWKS_URI`, `JWT_ISSUER`, and
`JWT_AUDIENCE`. Local token issuance is disabled in this mode, and the guard
accepts only RS256 tokens verified against the configured JWKS.

## Swagger

The Swagger UI is available at `http://localhost:3000/api` while the app is running.
Use **Authorize** to enter a bearer token for protected endpoints. The OpenAPI document
is available at `http://localhost:3000/api-json`.

For Kafka, the host app uses `localhost:9092`; an app inside Docker would use `kafka:19092`.

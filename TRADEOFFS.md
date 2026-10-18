## tradeoffs and assumptions
- Partial releases are not supported as not required, release is all-or-nothing and frees exactly the reserved amount
- programs CRUD operations are missing as not required, programs come from seed and from treasury messages
- FX rates, I assume it could be an external service, but for now it's just a static provider behind `FxRateProvider`
- no DELETE for reservations to avoid confusion, reservation - release logic, the row stays for audit
- Reservation is immutable, to change an amount: release and reserve again (amend is out of scope)
- Authorization is not per program, any valid token can touch any program

## Implementation:
- Idempotent reservation: same data 200, another amount 409
- Replay is compared by original amount and currency (what the client sent), not by converted amount, so a changed FX rate does not give a false 409
- Reserve of an already released invoice: 409 `INVOICE_ALREADY_RELEASED`, invoice is one-time per program
- Release: unknown reservation 404, repeated release 200 without changes
- Invoice ID is restricted to `A-Za-z0-9._:-` so it is safe in the URL path
- Reserve is one transaction: insert reservation (`ON CONFLICT DO NOTHING`), conditional `UPDATE programs ... WHERE reserved + :a <= limit`, insert movement. No rows updated = 422 and everything rolls back
- Why conditional UPDATE and not other options: invariant is simple and the row is hot (all invoices hit one program). `FOR UPDATE` holds the lock longer, optimistic locking would retry a lot, `SERIALIZABLE` needs retries too
- Release is a conditional status flip (`WHERE status = 'RESERVED'`), so two parallel releases cannot free capacity twice
- DB CHECK `0 <= reserved <= limit` is the second line of defense if the code has a bug
- `capacity_movements` is append-only (triggers block update, delete, truncate), it is the audit trail
- Locking order is the same everywhere (reservations first, then programs), so no deadlocks between reserve and release

## Money and currency:
- Integer minor units only: strings in API, `bigint` in DB, `BigInt` in code, never floats
- Minor unit exponent table per currency (USD 2, JPY 0, KWD 3), unknown currency is 422
- Conversion rounds up (ceil), so capacity is never over-allocated
- Original amount, original currency, rate and converted amount are stored on the reservation
- Release frees exactly the stored converted amount, no re-conversion at today's rate, so no drift
- FX rate is requested before the transaction, so no lock is held while a future external call runs
- Program currency in a Kafka message must match the existing program, otherwise DLQ (not converted, it is state, not an invoice)

## DEV notes:
- seed for dev purposes
- class-validator and not zod as it's nest.js only anyway and almost native
- Two migrations (schema, then treasury reconciliation). The first one was generated, so I didn't split it, in the best case scenario, would make sense to split by logical steps or tables
- postgresql and kafka in docker, nest.js is not
- AUTH: jwt token auth only, no scopes and no per-program authorization (could be `reservations:read`, `reservations:write`, `capacity:read`). In production an external IdP issues tokens and the service only validates them (RS256, JWKS). Dev token is a stand-in
- rate limiting is missing as not required, in production it is usually done on gateway / ingress (can be done, also tests should be updated or env set for them to test concurrency)
- helmet is baseline headers only, low value for a non-browser API. CORS is not enabled. Swagger is mounted only outside production
- Tests run on a separate database that is dropped and recreated, because the ledger is append-only and cannot be cleaned with DELETE / TRUNCATE
- Observability: logs only, no metrics and tracing. Alert = error log with a stable prefix (`TREASURY_LIMIT_BELOW_RESERVED`)
- Local Kafka is a single node in KRaft mode, no replication

## Kafka

Contract, key = `programId`, sequence rule `sequence > last_treasury_seq`. One message = one program, topic `treasury.program-capacity`, DLQ `treasury.program-capacity.dlq`
```json
{
  "messageId": "7d1f6a52-0f3b-4b57-9c52-5d3c9b6b1e11",
  "type": "RECONCILIATION",
  "programId": "00000000-0000-4000-8000-000000000001",
  "sequence": "42",
  "currency": "USD",
  "limitMinor": "1000000000",
  "reservedMinor": "12000",
  "sentAt": "2026-10-18T09:00:00.000Z"
}
```
- `CAPACITY_UPDATE` carries only `limitMinor` (`reservedMinor` must be absent), `RECONCILIATION` carries `limitMinor` and `reservedMinor`
- Treasury is the source of truth: reconciliation overwrites the aggregate (`limit`, `reserved`)
- A reservation made between the treasury snapshot and its application is lost from the aggregate
- Aggregate and reservation rows can diverge after reconciliation. Release of a reservation bigger than the aggregate fails loudly (500) instead of corrupting capacity
- No per-reservation reconciliation, the message carries only the aggregate
- Unknown program in a message is created from it
- Apply is one transaction with `SELECT ... FOR UPDATE` (not conditional UPDATE like reserve): there are several outcomes (stale, wrong currency, limit below reserved, apply) and the old `reserved` is needed for the delta
- Delivery is at-least-once, duplicates and redeliveries (restart, rebalance) are harmless: `sequence <= last_treasury_seq` is skipped
- Offset is committed after the handler returns. Permanent failures go to the DLQ and return, transient ones (DB down) throw, so offset is not committed and the message is read again
- Currency mismatch, invalid payload, and limit below reserved go to the DLQ with headers and an error log
- Self-contradictory `RECONCILIATION` (reserved above limit) goes to the DLQ before currency and sequence checks, even if it is stale
- Rejected snapshot does not advance `last_treasury_seq`, if treasury keeps resending the same invalid one the DLQ fills up
- Zero-delta reconciliations are not journaled; limit-only updates are logged, not journaled
- Reconcile movement has no reservation and a signed amount (delta of `reserved`), ledger CHECK was changed for that
- Migration `down()` of reconciliation fails if `RECONCILE` rows exist (append-only), and the enum value stays as Postgres cannot drop it
- Retry is bounded per attempt, then kafkajs restarts the consumer, the message is not lost. Unexpected non-DB errors (poison pill) can still block a partition. Production would cap retries and then dead-letter
- Rebalances in the log during restarts are expected
- `NODE_ENV=test` disables the DLQ producer connection, microservice is not started in e2e tests

Not done: schema registry, exactly-once, SASL/TLS, alerting, DLQ replay tooling, real FX service with dated rates
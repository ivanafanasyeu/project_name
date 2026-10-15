## tradeoffs and assumptions
- Partial releases are not supported as not required
- programs CRUD operations are missing as not required
- FX rates, I assume it could be an external service, but for now it's just a static provider
- no DELETE for reservations to avoid confusion, reservation - release logic

## Implementation:
- Idempotent reservation: same data 200, another amount 409

## DEV notes:
- seed for dev purposes
- class-validator and not zod as it's nest.js only anyway and almost native
- One migration file (it was generated, so I didn't split it, in the best case scenario, would make sense to split by logical steps or tables)
- postgresql in docker, nest.js is not
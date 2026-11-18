# API developer agent (ffy-api)

You build `api/`: the flag service and one HTTP adapter.

## You own

`api/**` only. You read everything else.

## What you build

- A framework-free core: `FlagService`, a `FlagRepository` interface with an in-memory
  implementation, an `AuditLog` interface with an in-memory implementation.
- One Fastify adapter that parses requests with the shared schemas, calls the service,
  maps domain errors to the error envelope, handles request ids and structured logs.

## Rules

- The core imports no HTTP framework and no storage library. The adapter holds no flag
  rules. Another repository or another adapter must be addable without touching the service.
- Every outcome and status code in `planning/docs/CONTRACTS.md` is implemented and tested.
  A rejected request writes nothing (no flag, no audit entry).
- A corrupt stored record is skipped and logged with `flag_invalid_record`. It never
  hides other flags.
- `GET /evaluate` never returns 404.
- Inject time, ids and the logger. Tests use the in-memory repository, not module mocks.
- Log lines are JSON with an `event` field and the request id. Never log secret values.
- If `shared` must change, stop and report to the planner.

## Before you report done

Package typecheck, lint and tests pass (`npm run typecheck -w api`, `npm test -w api`).
Report in this shape: what was done, verification (commands and results, or "not run"
and why), deferred. Do not edit task status. Do not run git.

# TASK-006: Fastify HTTP adapter

## Metadata

| Field | Value |
|-------|-------|
| ID | TASK-006 |
| Priority | P0 |
| Scope | MVP |
| Type | feature |
| Domain | api |
| Subprojects | api |
| Stories | FLG-01, FLG-03, ARC-02, OBS-01 |
| Depends on | TASK-004, TASK-005 |
| Blocks | TASK-009 |
| Status | ✅ |
| Created | 2026-11-18 |

## Description

Expose the service through the endpoints in `docs/CONTRACTS.md` with Fastify.
The adapter parses requests with `shared` schemas, calls the service, maps
domain errors to the error envelope, and owns request id handling and
structured logging. It contains no flag rules. Add a CORS setting for the UI
origin from an env variable, and a server entry point with a port variable.

## Acceptance Criteria

- [x] Every endpoint and status code in `docs/CONTRACTS.md` is implemented.
- [x] Validation failures return 400 `VALIDATION_ERROR` with failing fields in `details`. Duplicate key returns 409. Unknown key returns 404. Unexpected errors return 500 with no internal detail.
- [x] `x-request-id` is accepted when valid, otherwise generated, and always returned. It appears in every log line and error body.
- [x] `x-actor` is passed to the service and recorded in the audit log.
- [x] `GET /evaluate` never returns 404.
- [x] Log lines are JSON with an `event` field.
- [x] The README section for the API names the files to change to add another repository or another adapter.

## Verification

- [x] `npm test -w api` passes using the framework's inject helper, covering each outcome and checking that rejected requests leave the repository and audit log unchanged.
- [x] Manual: start the server and call each endpoint with `curl`, keeping the output as evidence.

## Deferred

- Express adapter (ARC-03).
- Dedicated `ROUTE_NOT_FOUND` code for unknown routes (needs `shared` and adapter change).
- No test of `server.ts` wiring itself; checked manually with curl (`docs/evidence/TASK-006/curl.md`). The 500 case is covered by tests only.
- `fastify` pulls `cookie@2.0.2` (via `light-my-request`) which declares Node >=22; it works on 20.19.4 but npm prints EBADENGINE.

## Comments

- **2026-11-18 16:15** — Created.
- **2026-11-18 17:50** — Built by ffy-api after ffy-shared added `INTERNAL_ERROR`. Typecheck, lint and 108 api tests pass. Mutation proofs on the 409 mapping and on the request id in error bodies. Manual curl run saved as evidence.

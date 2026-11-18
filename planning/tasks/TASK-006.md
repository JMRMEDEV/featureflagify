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
| Status | ⬚ |
| Created | 2026-11-18 |

## Description

Expose the service through the endpoints in `docs/CONTRACTS.md` with Fastify.
The adapter parses requests with `shared` schemas, calls the service, maps
domain errors to the error envelope, and owns request id handling and
structured logging. It contains no flag rules. Add a CORS setting for the UI
origin from an env variable, and a server entry point with a port variable.

## Acceptance Criteria

- [ ] Every endpoint and status code in `docs/CONTRACTS.md` is implemented.
- [ ] Validation failures return 400 `VALIDATION_ERROR` with failing fields in `details`. Duplicate key returns 409. Unknown key returns 404. Unexpected errors return 500 with no internal detail.
- [ ] `x-request-id` is accepted when valid, otherwise generated, and always returned. It appears in every log line and error body.
- [ ] `x-actor` is passed to the service and recorded in the audit log.
- [ ] `GET /evaluate` never returns 404.
- [ ] Log lines are JSON with an `event` field.
- [ ] The README section for the API names the files to change to add another repository or another adapter.

## Verification

- [ ] `npm test -w api` passes using the framework's inject helper, covering each outcome and checking that rejected requests leave the repository and audit log unchanged.
- [ ] Manual: start the server and call each endpoint with `curl`, keeping the output as evidence.

## Deferred

- Express adapter (ARC-03).

## Comments

- **2026-11-18 16:15** — Created.

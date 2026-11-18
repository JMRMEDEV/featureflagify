# TASK-003: Shared contract

## Metadata

| Field | Value |
|-------|-------|
| ID | TASK-003 |
| Priority | P0 |
| Scope | MVP |
| Type | feature |
| Domain | contract |
| Subprojects | shared |
| Stories | ARC-01, FLG-01 |
| Depends on | TASK-001 |
| Blocks | TASK-004, TASK-007 |
| Status | ⬚ |
| Created | 2026-11-18 |

## Description

Implement the schemas and types in `docs/CONTRACTS.md` in `shared`: flag key,
flag, create and toggle request bodies, list and evaluate responses, audit
entry, error envelope. Export the env-name helper that maps a key to its
`VITE_FF_` variable.

## Acceptance Criteria

- [ ] Key schema accepts and rejects the documented examples, including too long, uppercase, leading digit, trailing hyphen and underscore.
- [ ] Types are inferred from the schemas, not declared twice.
- [ ] The env-name helper maps `new-checkout` to `VITE_FF_NEW_CHECKOUT` and is one-to-one for every valid key.
- [ ] Request body schemas reject unknown fields and wrong types.
- [ ] The package exports schemas, types and the helper from one entry point.

## Verification

- [ ] `npm test -w shared` passes with cases for every rule above.
- [ ] `npm run typecheck` passes.

## Deferred

- None.

## Comments

- **2026-11-18 16:15** — Created.
- **2026-11-18 16:55** — Dependency on TASK-002 removed: the owner deferred it to P1.

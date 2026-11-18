# TASK-005: Audit log

## Metadata

| Field | Value |
|-------|-------|
| ID | TASK-005 |
| Priority | P1 |
| Scope | MVP |
| Type | feature |
| Domain | api |
| Subprojects | api |
| Stories | FLG-02 |
| Depends on | TASK-004 |
| Blocks | TASK-006 |
| Status | ✅ |
| Created | 2026-11-18 |

## Description

Add an `AuditLog` interface with an in-memory implementation and call it from
`FlagService` on create and on real state changes. The service receives the
actor and request id as call context.

## Acceptance Criteria

- [x] Create writes one `created` entry with `before` null and the initial value in `after`.
- [x] A toggle that changes the value writes one `enabled` or `disabled` entry with `before` and `after`.
- [x] A toggle to the current value writes nothing.
- [x] A failed operation writes nothing.
- [x] Entries are returned newest first and can be filtered by flag key.
- [x] A missing actor is recorded as `anonymous`.

## Verification

- [x] `npm test -w api` passes with one test per criterion.

## Deferred

- Persistent audit storage and retention rules.

## Comments

- **2026-11-18 16:15** — Created.
- **2026-11-18 17:30** — Built by ffy-api. Typecheck, lint and 28 tests in api pass. Mutation proof on the no-write-on-same-value guard. Write order: flag stored first, then audit; if append fails the service logs `audit_append_failed` and rethrows, so a stored change can lack an audit entry (needs a transactional backend to fix).

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
| Status | ⬚ |
| Created | 2026-11-18 |

## Description

Add an `AuditLog` interface with an in-memory implementation and call it from
`FlagService` on create and on real state changes. The service receives the
actor and request id as call context.

## Acceptance Criteria

- [ ] Create writes one `created` entry with `before` null and the initial value in `after`.
- [ ] A toggle that changes the value writes one `enabled` or `disabled` entry with `before` and `after`.
- [ ] A toggle to the current value writes nothing.
- [ ] A failed operation writes nothing.
- [ ] Entries are returned newest first and can be filtered by flag key.
- [ ] A missing actor is recorded as `anonymous`.

## Verification

- [ ] `npm test -w api` passes with one test per criterion.

## Deferred

- Persistent audit storage and retention rules.

## Comments

- **2026-11-18 16:15** — Created.

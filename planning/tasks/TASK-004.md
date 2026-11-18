# TASK-004: Flag service core and in-memory repository

## Metadata

| Field | Value |
|-------|-------|
| ID | TASK-004 |
| Priority | P0 |
| Scope | MVP |
| Type | feature |
| Domain | api |
| Subprojects | api |
| Stories | FLG-01, FLG-03, ARC-02 |
| Depends on | TASK-003 |
| Blocks | TASK-005, TASK-006 |
| Status | ⬚ |
| Created | 2026-11-18 |

## Description

Build the framework-free core: a `FlagRepository` interface, an in-memory
implementation, and a `FlagService` with create, list, toggle and evaluate.
Domain errors (`FlagExistsError`, `FlagNotFoundError`) are plain classes the
adapter maps later. Records read from the repository are validated one by one,
so a corrupt record is skipped with a log event and never hides other flags.

## Acceptance Criteria

- [ ] `FlagService` imports no HTTP framework and no storage library.
- [ ] Create stores a flag, off unless `enabled` is given, and rejects a duplicate key.
- [ ] Toggle updates `enabled` and `updatedAt`, and fails for an unknown key.
- [ ] Evaluate returns a key-to-boolean map of all valid flags.
- [ ] A corrupt record is left out of the list and the map, a `flag_invalid_record` event is logged with the key, and other flags are unaffected.
- [ ] Time and logging are injected, so tests need no module mocks.

## Verification

- [ ] `npm test -w api` passes, including the corrupt-record case with a repository that returns one bad and one good record.

## Deferred

- Persistent repository. The interface is the extension point.

## Comments

- **2026-11-18 16:15** — Created. The corrupt-record case adapts a bug found in the source project, where one bad value disabled every flag.

# TASK-009: Flag management screen

## Metadata

| Field | Value |
|-------|-------|
| ID | TASK-009 |
| Priority | P0 |
| Scope | MVP |
| Type | feature |
| Domain | ui |
| Subprojects | ui |
| Stories | FLG-01, RES-02 |
| Depends on | TASK-006, TASK-008 |
| Blocks | TASK-010 |
| Status | ✅ |
| Created | 2026-11-18 |

## Description

Build the screen: flag list, create form, and toggle switches. The screen
manages flags through the management endpoints and also shows how this client
resolves its own declared flags, with the source of each value.

## Acceptance Criteria

- [x] The list shows key, name, description, enabled state and last update.
- [x] The create form validates the key with the shared schema before sending, shows the error next to the field, and shows server errors (duplicate key) clearly.
- [x] Each toggle is a labelled switch with `role="switch"` and `aria-checked`.
- [x] Toggling updates the switch at once and rolls back with an error message if the request fails. A live region announces the result.
- [x] A section lists the flags this client declares with the resolved value and source, and marks flags missing from the API. Flags in the API that no code declares are marked as undeclared.
- [x] A banner appears when the API is unavailable, and management actions are disabled with an explanation.
- [x] Empty list and loading states are handled.

## Verification

- [x] A few component tests cover form validation, toggle rollback and the announcement.

## Deferred

- Audit history view in the UI. The API exposes it.
- No manual browser check was run; behavior is covered by component tests only.
- Repeated identical live-region text may not re-announce in a screen reader. Left as is.
- Keyboard-only operation and a manual keyboard walkthrough. Out of scope, removed by the owner on 2026-11-18. Native controls still work with the keyboard by default.

## Comments

- **2026-11-18 16:15** — Created.
- **2026-11-18 17:20** — Owner removed the keyboard-only requirement and its manual walkthrough as out of scope.
- **2026-11-18 17:45** — Built by ffy-dev after one interrupted run. Typecheck, lint, build and 93 ui tests pass. Mutation proofs on the rollback and on the pre-send key validation.

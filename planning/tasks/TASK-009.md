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
| Status | ⬚ |
| Created | 2026-11-18 |

## Description

Build the screen: flag list, create form, and toggle switches. The screen
manages flags through the management endpoints and also shows how this client
resolves its own declared flags, with the source of each value.

## Acceptance Criteria

- [ ] The list shows key, name, description, enabled state and last update.
- [ ] The create form validates the key with the shared schema before sending, shows the error next to the field, and shows server errors (duplicate key) clearly.
- [ ] Each toggle is a labelled switch with `role="switch"` and `aria-checked`, reachable and operable by keyboard.
- [ ] Toggling updates the switch at once and rolls back with an error message if the request fails. A live region announces the result.
- [ ] A section lists the flags this client declares with the resolved value and source, and marks flags missing from the API. Flags in the API that no code declares are marked as undeclared.
- [ ] A banner appears when the API is unavailable, and management actions are disabled with an explanation.
- [ ] Empty list and loading states are handled.

## Verification

- [ ] A few component tests cover form validation, toggle rollback and the announcement.
- [ ] Manual keyboard-only walkthrough: create a flag and toggle it without a mouse.

## Deferred

- Audit history view in the UI. The API exposes it.

## Comments

- **2026-11-18 16:15** — Created.

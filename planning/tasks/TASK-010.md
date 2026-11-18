# TASK-010: Fallback demonstration and evidence

## Metadata

| Field | Value |
|-------|-------|
| ID | TASK-010 |
| Priority | P1 |
| Scope | MVP |
| Type | chore |
| Domain | delivery |
| Subprojects | api, ui |
| Stories | RES-01, RES-02 |
| Depends on | TASK-009 |
| Blocks | TASK-011, TASK-012 |
| Status | ⬚ |
| Created | 2026-11-18 |

## Description

Prove the main behavior end to end and keep the evidence. Run API and UI, change
a flag, stop the API, reload, and show env and default values with their
sources. This is the walkthrough for the screen recording.

## Acceptance Criteria

- [ ] With the API running, a toggle in the UI changes the resolved value on refresh, source `api`.
- [ ] With the API stopped, the UI loads and shows the unavailable banner. A flag with a `VITE_FF_` value shows source `env`, and one without shows source `default`.
- [ ] Restarting the API and using refresh returns the values to source `api`.
- [ ] Steps and outcomes are written in the README demo section.

## Verification

- [ ] Evidence: terminal output or screenshots for each state, linked from this task.

## Deferred

- None.

## Comments

- **2026-11-18 16:15** — Created.

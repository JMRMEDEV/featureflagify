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
| Status | ✅ |
| Created | 2026-11-18 |

## Description

Prove the main behavior end to end and keep the evidence. Run API and UI, change
a flag, stop the API, reload, and show env and default values with their
sources. This is the walkthrough for the screen recording.

## Acceptance Criteria

- [x] With the API running, a toggle in the UI changes the resolved value on refresh, source `api`.
- [x] With the API stopped, the UI loads and shows the unavailable banner. A flag with a `VITE_FF_` value shows source `env`, and one without shows source `default`.
- [x] Restarting the API and using refresh returns the values to source `api`.
- [x] Steps and outcomes are written in the README demo section.

## Verification

- [x] Evidence: terminal output or screenshots for each state, linked from this task.
  - Done: [demo.md](../../docs/evidence/TASK-010/demo.md), real API plus the production resolver for all three states, run by `ffy-qa`. A production build with `VITE_FF_BETA_SEARCH=true` contains the value.
  - Browser run: the owner ran [manual-walkthrough.md](../../docs/evidence/TASK-010/manual-walkthrough.md) by hand on 2026-11-18 and reported that all steps pass. No agent ran them. The result table in that file is not filled in, and no screenshots or recording are saved in the repository.

## Deferred

- None.

## Comments

- **2026-11-18 16:15** — Created.
- **2026-11-18 17:55** — ffy-qa produced the API-level evidence and the walkthrough. The three acceptance criteria that show the screen stay open until the owner runs the browser steps.
- **2026-11-18 17:55** — Owner ran the browser walkthrough and reported all steps pass. One observation: a flag the owner created (`dark-mode`) is not declared by the app, so all declared rows correctly showed "Missing from API" and `dark-mode` is `undeclared`. README now tells readers to use the declared keys.

# UI developer agent (ffy-dev)

You build `ui/`: a Vite + React + TypeScript client for the flag API.

## You own

`ui/**` only. You read everything else.

## What you build

- A typed flag registry (`defineFlags`) so an undeclared key fails the build.
- A pure resolver: API value, then env fallback, then code default, each reported
  with its source (`api`, `env`, `default`).
- A provider that fetches `GET /evaluate` after the first render, with a timeout, and
  falls back on every failure kind without throwing.
- The management screen: list, create, toggle (labelled switch, rollback on error,
  live-region announcement), source column, API-unavailable banner.

## Rules

- Import shapes and the env-name helper from `shared`. Never re-declare them.
- The resolver is a pure function: no React, no `fetch`.
- Inject `fetch` and timers so tests need no module mocks.
- Env values are inlined at build time: they are a startup fallback, not a live control.
- If `shared` or `api` must change, stop and report to the planner.
- Accessibility is part of done: roles, labels, keyboard operation, announcements.

## Before you report done

Package typecheck, lint and tests pass (`npm run typecheck -w ui`, `npm test -w ui`).
Report in this shape: what was done, verification (commands and results, or "not run"
and why), deferred. Do not edit task status. Do not run git.

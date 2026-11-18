# TASK-008: UI flag provider with timeout and fallback

## Metadata

| Field | Value |
|-------|-------|
| ID | TASK-008 |
| Priority | P0 |
| Scope | MVP |
| Type | feature |
| Domain | ui |
| Subprojects | ui |
| Stories | RES-01 |
| Depends on | TASK-007 |
| Blocks | TASK-009 |
| Status | ⬚ |
| Created | 2026-11-18 |

## Description

Add a `FlagProvider` and a `useFlag` hook. The provider fetches
`GET /evaluate` after the first render, validates the response with the shared
schema, and exposes the resolved values, the API state (`loading`, `ok`,
`unavailable`) and a `refresh` function. Every failure falls back to env and
defaults. The fetch function is injected for tests.

## Acceptance Criteria

- [ ] The first render uses env and defaults, and does not wait for the fetch.
- [ ] A fetch that exceeds the timeout is aborted with `AbortController` and treated as a failure.
- [ ] Network error, non-2xx, invalid JSON and a schema-invalid body each set `unavailable` and keep fallback values, without throwing.
- [ ] A successful fetch replaces fallback values with API values and updates the state to `ok`.
- [ ] `refresh` can be called after a failure and recovers when the API returns.
- [ ] Concurrent refresh calls do not start overlapping requests.
- [ ] `useFlag` returns `{ value, source }`.

## Verification

- [ ] `npm test -w ui` passes with cases for success, each failure kind, timeout, recovery and the no-overlap guard.
- [ ] Break the fallback once on purpose (for example, return an empty map on failure), confirm a test fails, and restore it.

## Deferred

- Caching last-known values (RES-03).

## Comments

- **2026-11-18 16:15** — Created. The source project had no fetch timeout and no tests for this path, which is why both are explicit here.

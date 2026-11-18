# TASK-007: UI flag registry and resolver

## Metadata

| Field | Value |
|-------|-------|
| ID | TASK-007 |
| Priority | P0 |
| Scope | MVP |
| Type | feature |
| Domain | ui |
| Subprojects | ui |
| Stories | FLG-03, RES-01, RES-02 |
| Depends on | TASK-003 |
| Blocks | TASK-008 |
| Status | ⬚ |
| Created | 2026-11-18 |

## Description

Create the Vite + React package with a typed registry (`defineFlags`) and a
pure resolver. The registry declares the flags the app uses and their code
defaults, and gives compile-time checking of keys. The resolver takes a
registry, the API map (or nothing) and the env, and returns `{ value, source }`
for each declared flag.

## Acceptance Criteria

- [ ] `defineFlags({ 'new-checkout': false })` types hook arguments so an undeclared key fails typecheck. A test uses `@ts-expect-error` to prove it.
- [ ] Resolution order is API, then env, then code default, and the result reports `api`, `env` or `default`.
- [ ] Env parsing accepts `true`, `1`, `false`, `0` and ignores any other value.
- [ ] A key absent from the API map falls through to env, then default.
- [ ] Env variable names come from the shared helper.
- [ ] Before relying on dynamic env lookup in Vite, test it. If it does not work, list the declared env variables explicitly and record the reason in `docs/ARCHITECTURE.md`.
- [ ] The resolver is a pure function with no React or `fetch` imports.

## Verification

- [ ] `npm test -w ui` passes with a test for every branch of the order and for env parsing.
- [ ] `npm run typecheck` passes.

## Deferred

- Generating the registry from the API.

## Comments

- **2026-11-18 16:15** — Created.

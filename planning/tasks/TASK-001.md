# TASK-001: Monorepo scaffold

## Metadata

| Field | Value |
|-------|-------|
| ID | TASK-001 |
| Priority | P0 |
| Scope | MVP |
| Type | infra |
| Domain | platform |
| Subprojects | shared, api, ui |
| Stories | — |
| Depends on | — |
| Blocks | TASK-002, TASK-003 |
| Status | ✅ |
| Created | 2026-11-18 |

## Description

Create the npm workspace with `shared`, `api` and `ui`, the shared TypeScript
and test configuration, and the root scripts. This is the reused part of the
submission: layout and tooling patterns come from the owner's existing
codebases. No flag logic is written here.

## Acceptance Criteria

- [x] Root `package.json` declares workspaces `shared`, `api` and `ui`. `planning` and `libs` are not workspaces.
- [x] `tsconfig.base.json` enables strict mode and each package extends it.
- [x] Each package has a Vitest config and one placeholder test that passes.
- [x] Root scripts: `dev`, `test`, `typecheck`, `lint`. `npm test` runs every package.
- [x] `.nvmrc` pins the Node version. `.gitignore` ignores `.env*` except `.env.example`, and `node_modules` and build output.
- [x] The variable names in `docs/CONTRACTS.md` are listed in the README. The owner creates `.env.example` by hand, because agents cannot read or write any `.env*` file.

## Verification

- [ ] From a fresh clone: `npm install`, `npm test`, `npm run typecheck` pass. Not run, owner decision (see Deferred). Run in the working tree instead: install, typecheck, lint and test exit 0 in all three packages.

## Deferred

- Fresh-clone verification skipped by the owner on 2026-11-18. Repeat it with a real `git clone` after the first commits.
- `.gitignore` env rules checked by reading only. `git check-ignore` on `.env*` paths is blocked by the shell policy; the owner can run it.
- `.env.example` is created by the owner by hand.
- Node pinned to 20.19.4. Newer vitest, jsdom and TypeScript need Node 22.12+; revisit if wanted.

## Comments

- **2026-11-18 16:15** — Created.
- **2026-11-18 16:47** — Scaffold built by ffy-shared, ffy-api, ffy-dev. In-tree install, typecheck, lint and test passed. QA notes in `docs/evidence/TASK-001/qa-result.md`. Marked done with the fresh-clone check deferred.

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
| Status | ⬚ |
| Created | 2026-11-18 |

## Description

Create the npm workspace with `shared`, `api` and `ui`, the shared TypeScript
and test configuration, and the root scripts. This is the reused part of the
submission: layout and tooling patterns come from the owner's existing
codebases. No flag logic is written here.

## Acceptance Criteria

- [ ] Root `package.json` declares workspaces `shared`, `api` and `ui`. `planning` and `libs` are not workspaces.
- [ ] `tsconfig.base.json` enables strict mode and each package extends it.
- [ ] Each package has a Vitest config and one placeholder test that passes.
- [ ] Root scripts: `dev`, `test`, `typecheck`, `lint`. `npm test` runs every package.
- [ ] `.nvmrc` pins the Node version. `.gitignore` ignores `.env*` except `.env.example`, and `node_modules` and build output.
- [ ] The variable names in `docs/CONTRACTS.md` are listed in the README. The owner creates `.env.example` by hand, because agents cannot read or write any `.env*` file.

## Verification

- [ ] From a fresh clone: `npm install`, `npm test`, `npm run typecheck` pass.

## Deferred

- None.

## Comments

- **2026-11-18 16:15** — Created.

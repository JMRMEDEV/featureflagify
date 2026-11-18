# Shared contract agent (ffy-shared)

You own `shared/`: the single source of truth for the contract used by `api` and `ui`.

## You own

`shared/**` only. You read everything else.

## What you build

Zod schemas and inferred types for the flag key, flag, request bodies, responses,
audit entry and error envelope, plus the helper that maps a key to its `VITE_FF_`
variable name. The shapes are defined in `planning/docs/CONTRACTS.md`.

## Rules

- Types are inferred with `z.infer`. Never write the same shape as an interface and a schema.
- A shape change needs a matching `planning/docs/CONTRACTS.md` edit approved by the
  planner. Without it, stop and report.
- After a change, `api` and `ui` must still typecheck. Run `npm run typecheck` at the
  root and report the dependants that break; the owners of those packages fix them.
- Key schema: lowercase kebab-case, immutable, one-to-one with the env name. Tests cover
  accepted and rejected examples.
- No runtime dependency beyond Zod. No framework imports.

## Before you report done

Package typecheck and tests pass (`npm run typecheck -w shared`, `npm test -w shared`),
and the root typecheck result is reported. Report in this shape: what was done,
verification, deferred. Do not edit task status. Do not run git.

# TypeScript Validation — All Agents

Canonical policy. Applies to every `.ts` and `.tsx` file in `api/`, `ui/` and `shared/`.
Adapted from the `typescript-validation` preset (cairel-core 1.0.0), with the project
additions marked below. The step-by-step procedure is in the skill `typescript-validation`.

**Purpose:** never let type errors accumulate. A type error is cheapest to fix while the
change that caused it is still in your context.

## Critical rules

1. **Typecheck after EVERY `.ts`/`.tsx` change.** Run the package's typecheck:
   `npm run typecheck -w <package>` (it runs `tsc --noEmit` for that package). Use
   `npm run typecheck` at the root when a change in `shared` can break `api` or `ui`.
2. **Stop and fix.** With errors present, stop adding code. Fix all of them, rerun the
   typecheck, and continue only on exit code 0.
3. **Validate the first file before the rest.** When a unit needs several files (a
   component, a service plus its interface), typecheck after the first before creating
   the others, so one wrong type does not spread.
4. **Never silence an error to pass.** No `@ts-ignore`, no `@ts-expect-error` (except in
   a test that proves a compile-time error on purpose, with a comment saying so), no `any`,
   no `as` cast that hides a mismatch, no `!` non-null assertion on data you did not check.

## Project additions

5. **Parse at the boundary.** Data from the network, env, storage or a request body is
   `unknown` until a `shared` Zod schema parses it. Types come from `z.infer`, not from a
   second hand-written interface.
6. **Do not weaken the config.** `strict` and `noUncheckedIndexedAccess` come from
   `tsconfig.base.json`, which the planner owns. Never loosen a flag in a package to make
   an error go away; report it instead.
7. **Import extensions follow the tsconfig.** Read the package's `moduleResolution` before
   adding or removing `.js` extensions. Do not change them to silence an error.
8. **Typecheck is not the finish line.** Before reporting done, the package typecheck,
   lint and tests all pass (`verification.md`).

## Checklist before reporting done

- [ ] `npm run typecheck -w <package>` exits 0, and the root typecheck exits 0 if you
      touched `shared`
- [ ] No `any`, `@ts-ignore`, unchecked `as` or `!` added
- [ ] Every external input goes through a schema
- [ ] Lint and tests pass
- [ ] You can state the typecheck result and command output in your report

## Common mistakes

- Writing three files and typechecking once at the end.
- Fixing some errors and moving on with the rest.
- Declaring a type that already exists in `shared`.
- Skipping the typecheck "to save time" on a one-line change.

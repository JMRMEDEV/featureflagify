---
name: typescript-validation
description: Validate TypeScript compilation after every .ts/.tsx change in api/, ui/ or shared/. Activate when you create or modify TypeScript, before you create the next file, and before you report a task done. Runs the package typecheck, fixes every error, and rejects shortcuts such as any, @ts-ignore and unchecked casts.
---

# TypeScript validation procedure

Policy: `.kiro/steering/typescript-validation.md`. Adapted from the `typescript-validation`
preset (cairel-core 1.0.0). This skill is the procedure; the steering file is the rule.

## Inputs

The package you changed (`shared`, `api` or `ui`) and the files you touched.

## Loop

```text
Create or modify a .ts/.tsx file
   -> npm run typecheck -w <package>
   -> errors? yes -> fix ALL of them -> rerun
   -> exit code 0 -> next file, or the next step of the task
```

1. **Pick the scope.** One package: `npm run typecheck -w <package>`. After any change in
   `shared`: `npm run typecheck` at the root, because `api` and `ui` depend on it.
2. **Read the first error, not the last.** Later errors are often caused by the first one.
   Fix it, rerun, repeat. Do not patch a symptom in another file.
3. **Fix at the cause.** A type mismatch between `api` and `ui` is fixed in `shared` (or
   reported to the planner if you do not own it), never by a cast in the consumer.
4. **Multi-file units.** Typecheck after the first file. Create the next file only on exit 0.
5. **Report.** Include the command and its result in your report. If you could not run it,
   say so and why.

## Rejected shortcuts

| Shortcut | Do instead |
|----------|-----------|
| `any` | `unknown` plus a schema parse, or the real type |
| `as SomeType` to make an error go away | fix the value or the declared type |
| `// @ts-ignore` | fix the error. `@ts-expect-error` is allowed only in a test that proves a compile error on purpose |
| `value!` on unchecked data | narrow with a check or a schema |
| Loosening a `tsconfig` flag in a package | report it to the planner |
| Redeclaring a shared shape | import it from `shared` |

## Boundary check

For each place where outside data enters (fetch response, env value, request body, stored
record), confirm it is `unknown` until a `shared` schema parses it, and that the type you use
afterwards is `z.infer` of that schema.

## Checklist (report pass, fail or not checked)

- [ ] Package typecheck exits 0
- [ ] Root typecheck exits 0 (required if `shared` changed)
- [ ] No `any`, `@ts-ignore`, unchecked `as` or `!` added
- [ ] Boundaries parse with schemas
- [ ] Lint and tests pass

## Example

```bash
# edit shared/src/flag.ts
npm run typecheck -w shared      # exit 0
npm run typecheck                # api: error TS2345 in api/src/service.ts
# fix api/src/service.ts only if you own api; otherwise report to the planner
```

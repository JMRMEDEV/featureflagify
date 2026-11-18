# Architecture

Research behind these decisions:
[codebase patterns](../../docs/research/codebase-patterns.md). Product intent is
in [VISION.md](VISION.md). Wire formats are in [CONTRACTS.md](CONTRACTS.md).

## Repository layout

```text
featureflagify/
  api/        flag service: framework-free core + one HTTP adapter
  ui/         Vite + React client with API-first resolution and env fallback
  shared/     Zod schemas and types used by api and ui
  planning/   HermOS planning repository (this folder), not an npm workspace
  libs/hermOS copy of HermOS, kept so readers can see what generated planning/
  docs/       research and project-level documentation
  .kiro/      agent definitions and steering rules
```

`api`, `ui` and `shared` are npm workspaces. `planning` and `libs` are not, so
planning tooling never adds dependencies to the product packages.

## Layers

```text
ui   FlagProvider -> resolver (api > env > default) -> typed registry
        |  HTTP, validated with shared schemas
api  HTTP adapter (Fastify)
        |  calls
     FlagService (create, list, toggle, evaluate map)
        |  depends on interfaces only
     FlagRepository   AuditLog        <- in-memory implementations
```

- The core (`FlagService`, interfaces, in-memory implementations) imports no
  HTTP framework. The adapter translates HTTP to service calls and errors to the
  error envelope.
- Replacing storage means writing another `FlagRepository`. Replacing the HTTP
  framework means writing another adapter. Neither touches the service.

## Resolution order (D1)

```text
1. API value        (when the fetch succeeds and the key is present)
2. env fallback     (VITE_FF_<KEY>, parsed as true/1 or false/0)
3. code default     (declared in the consumer's typed registry)
```

Each resolution returns `{ value, source }`. Env values are inlined at build
time, so they act as a startup fallback only.

Dynamic env lookup works (tested in TASK-007 with Vite 8.3.8). A production build
replaces `import.meta.env` with an object holding every `VITE_` variable present at
build time, so `import.meta.env['VITE_FF_' + name]` resolves at runtime. The provider
passes `import.meta.env` whole to the resolver, and no explicit variable list is
needed. Every `VITE_` variable ends up in the bundle, so secrets never use that prefix.

## Flag keys (D2)

Keys are created at runtime, so `shared` cannot list them at compile time.

- `shared` validates keys with a kebab-case schema and types flag values as
  `Record<string, boolean>`.
- Each consumer declares the flags it uses with code defaults in one typed
  registry, for example `defineFlags({ 'new-checkout': false })`. Flag keys used
  in that app are checked at compile time. Typos fail the build.
- The API may hold flags no consumer declares, and a consumer may declare flags
  the API does not hold yet. Both are valid.
- Codegen of the registry from the API is a documented next step.

## Decision register

| ID | Decision | Status |
|----|----------|--------|
| D1 | Resolution order API, then env, then default; no dev-force tier | Settled |
| D2 | Dynamic keys in the contract, typed registry per consumer | Settled |
| D3 | `FlagRepository` interface with an in-memory implementation | Proposed |
| D4 | Vitest in every package | Proposed |
| D5 | Resolver reports the source of each value | Proposed |
| D6 | React context for UI flag state, no state library | Proposed |
| D7 | HermOS generates and structures `planning/` | Settled |
| D8 | Disable only. No delete and no archive in this iteration | Settled |
| D9 | Fastify for the one example HTTP adapter | Proposed |
| D10 | Validation errors return 400, following the Hermes convention | Proposed |
| D11 | No authentication. Actor comes from an optional `x-actor` header | Proposed |

Proposed decisions are the working assumption. Change them in this table, and
add the reason, if implementation shows a better option.

## Deliberately not built

| Item | Reason |
|------|--------|
| Targeting, percentage rollouts, multiple environments | Each changes the evaluation model. A boolean map keeps the first iteration reviewable |
| Authentication and roles | The challenge brief says to skip them. `x-actor` is recorded but not trusted |
| Persistent storage | The interface is the point. A persistent repository is a small follow-up |
| Delete and archive (FLG-04) | Not requested. Disabling is the off-switch. Known limit: a flag created with a typo cannot be removed |
| Cached last-known values (RES-03) | Needs a storage and invalidation policy. Listed as a next step |
| Second HTTP adapter (ARC-03) | One adapter plus a clean seam shows the idea without doubling the surface |
| Typed codegen from the API | Needs a build step and CI. Listed as a next step |

## Observability

- Every request has an id: `x-request-id` is accepted or generated, returned in
  the response, and included in every log line and error body.
- Logs are structured JSON with an `event` name, for example `flag_created`,
  `flag_toggled`, `flag_invalid_record`.
- Create and toggle actions are written to the audit log.

## Security

- Agents may not read or write any `.env*` file, `.env.example` included. The rule
  is enforced in agent tool settings and repeated in steering.
- Flag values are non-sensitive booleans. No personal data is processed.

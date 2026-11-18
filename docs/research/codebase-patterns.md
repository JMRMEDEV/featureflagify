# Codebase Patterns: Feature Flags in Project Hermes v2

Research input for scaffolding `featureflagify` user stories and tasks.
Source: read-only survey of the Hermes workspace on 2026-11-18, starting from
`project-hermes-v2-planning/hermes.code-workspace`.

Scope of this file: what exists, where it lives, which patterns are worth
carrying over, and what must change. Nothing here has been copied into this repo.

## 1. Where the infrastructure lives

| Layer | Repo | Location | Role |
|-------|------|----------|------|
| Shared contract | `project-hermes-types` | `src/featureFlags.ts` | `FEATURE_FLAGS` registry (as-const), `FeatureFlag` union, `IFeatureFlags` map |
| API service | `project-hermes-v2-api` | `packages/feature-flags/` | `GET /feature-flags`, Firestore-backed, read-only |
| API wiring | `project-hermes-v2-api` | `packages/gateway/src/routes.ts`, `packages/shared/src/middleware/auth.ts`, `firebase.json` | Route map, public-route allowlist, codebase entry |
| Web consumer | `project-hermes-v2` | `services/featureFlags.ts`, `services/api/featureFlags.ts`, `stores/flagStore.ts`, `hooks/useFeatureFlag.ts`, `components/elements/ToggleFeatureFlag/` | Env overrides, defaults, fetch, store, hook, gate component |
| Planning | `project-hermes-v2-planning` | `user-stories/release.md` (REL-13), `tasks/TASK-334, 335, 357, 383, 398` | Story, task specs, outcome notes |
| Agent config | `project-hermes-v2-planning` | `.kiro/agents/*.json`, `.kiro/steering/*.md` | Per-repo agents, security and test rules |

Task chain: TASK-334 (env tier + hook) -> TASK-357 (shared registry +
`<ToggleFeatureFlag>`) -> TASK-335 (runtime tier) -> TASK-398 (web test coverage,
still `todo`).

## 2. Patterns worth carrying over

### P1. Single typed registry, keys derived once
`FEATURE_FLAGS = { storyPoints: 'storyPoints' } as const`, then
`FeatureFlag = keyof typeof FEATURE_FLAGS`. Every consumer is keyed by the
derived type (`Record<FeatureFlag, ...>`), so adding a flag produces compile
errors anywhere a case is missing. No string literals for flag keys in consumers.

For featureflagify this changes (decision D2). Flags can be created at runtime,
so `shared` cannot hold a compile-time list of keys. `shared` keeps the Zod key
and flag schemas; each consumer keeps its own typed registry (section 9).

### P2. Fixed precedence chain, flag resolved at the call site
```
1. env override   (build-time, tri-state: "true"/"1" | "false"/"0" | unset)
2. runtime value  (API)
3. hardcoded default (everything OFF)
```
`hooks/useFeatureFlag.ts` is about ten lines and is the only place the chain
exists. Call sites never change when a tier is added (TASK-334 designed the hook
for all three tiers before the runtime tier existed).

Note the Hermes order differs from the order proposed for featureflagify. See
Decision D1 below.

### P3. Tri-state env override
`parseOverride` returns `true | false | undefined`. `undefined` means "defer to
the next tier", which lets a developer force a flag on or off locally without
disabling the other tiers for unset flags.

### P4. Safe defaults and "never 404"
- API: if the config document is missing, return the full map with every known
  flag `false`. The endpoint never 404s, so pre-login UI always resolves a
  complete set.
- Web: a missing or misspelled flag resolves to the default (`false`).

### P5. Per-key validation, one bad value must not disable all flags
Regression found in review of TASK-335: validating the whole Firestore document
at once meant one malformed field blacked out every flag. The fix validates each
known flag independently with `z.boolean().safeParse`, keeps the default for the
bad key only, and logs a warning with a structured event name
(`feature_flag_invalid_value`, `flag: <key>`).

This has a dedicated test file (`featureFlagsService.resilience.test.ts`) that
mocks the registry with two flags to make the case reachable. Carry over both the
behavior and the test shape.

### P6. Unknown keys are stripped, not rejected
`featureFlagsSchema` uses `.partial().strip()`. A newer client can know a flag
this deployment does not. Forward compatible by design.

### P7. Fetch failure is swallowed, store never blocks boot
`flagStore.fetchFlags()` guards against concurrent calls with `loading`, catches
every error, sets `hasFetched = true`, and leaves `flags` untouched so the hook
falls through to env or default. The fetch is fire-and-forget from the root
layout. No error is shown to the user.

### P8. Declarative gate component with a test escape hatch
`<ToggleFeatureFlag flag override>` renders children when
`override ?? useFeatureFlag(flag)`. `override` lets Storybook and tests force a
state without env vars. This replaced per-feature prop threading
(`storyPointsEnabled` on `AppSidebar`).

### P9. Package shape and handler contract
API package layout, mirroring the repo's reference service:
```
packages/feature-flags/
  src/{schemas,services,handlers}/ + index.ts
  __tests__/ (service, resilience, jest.setup.ts)
  jest.config.ts, tsconfig.json, package.json, README.md
```
Response envelope: `200 { "data": { "flags": { ... } } }`. The handler is thin
and forwards errors with `next(err)`. The Express `app` is exported separately
from the Cloud Function wrapper so tests can use supertest.

### P10. Observability already wired
`requestLogger({ trustRequestIdHeader: true })` mounted first, structured
`logger.warn` with an `event` field, shared `errorHandler` and `ApiError`.
Request ID resolution lives in `@hermes/shared`.

### P11. Planning artifacts with strict bookkeeping
Story (REL-13) -> tasks with front matter (`status`, `priority`, `domain`,
`subprojects`, `stories`, `depends_on`, `blocks`) -> `Outcome` section
(What was done, Verification, Comments). A pre-commit guard validates front
matter, stats and ID collisions. HermOS packages this model:
`node bin/hermos.js init <dir> --name <n> --repos <list>` scaffolds a planning
repo and writes `.hermos/manifest.json`. HermOS is committed into the planning
repo and is not a runtime dependency.

### P12. Test strategy tiers
Per `.kiro/steering/test-strategy.md`: API unit tests are strictest (status
codes, error shape, validation, no writes on rejected input); web unit tests
cover pure logic (schemas, stores, helpers); E2E only for real flows. TASK-398
shows the web gap that happened when the runtime tier merged without tests.

## 3. Pattern fit for featureflagify goals

| Goal | Reusable from Hermes | Needs to change |
|------|----------------------|-----------------|
| Agnostic, one example server | Handler/service split (P9), Zod schema (P1, P6) | Service depends on `db` from `@hermes/shared` (Firestore). Introduce a `FlagRepository` interface; Firestore becomes one of the possible implementations, in-memory is the default |
| Monorepo | `api` + `shared` split already mirrors `project-hermes-v2-api` + `project-hermes-types` | Hermes types ship as a published private package (tarball workaround). Here `shared` is a workspace package, no publishing |
| API with frontend fallback | P2, P3, P4, P7 | Hermes uses Expo (`EXPO_PUBLIC_FF_*`) and Zustand. Here Vite (`VITE_FF_*`) and a lighter store or React context |
| Kiro agents with security rules | `.kiro/steering/security.md`, `toolsSettings` | See section 4 |
| Unit tests | P5 resilience test, TASK-398 plan | Jest becomes Vitest on both sides (decision D4) |

## 4. Gaps and issues found (do not copy as-is)

### G1. Env-file protection is advice in steering, not enforced everywhere
Observed in `hermes-api.json`:
- `fs_read.deniedPaths` blocks `./**/.env`, `./**/.env.*` and `.envrc`. This is a
  real control for the file-read tool.
- `toolsSettings.shell.deniedCommands` contains only `^gcloud`. Nothing in the
  config stops `cat .env` through the shell tool. The ban on that is only in
  `security.md` and the `agentSpawn` hook echo.
- `fs_write` has no `deniedPaths` in the block I read (the object has only
  `shell` and `fs_read`). Writing to `.env*` is not restricted by config.
- `./**/.env.*` also matches `.env.example`, which contradicts the goal of
  allowing `.env.example`. Whether the tool's matcher supports negation or
  allow-overrides is unverified. Check the Kiro docs before relying on it.

**Resolved 2026-11-18.** Tested on kiro-cli 2.20.1: `deniedPaths` globs are enforced even
with a trusted tool, and `deniedCommands` matches the whole command string (so `^gcloud`
style prefixes need a `(?s).*...*` wrapper). The owner chose a hard block on every `.env*`
file, `.env.example` included. See `.kiro/steering/security.md`. Original note follows.

For featureflagify: deny `.env*` for read and write, allow `.env.example`, and
cover the shell tool with `deniedCommands` regexes for common readers
(`cat|less|more|head|tail|grep|sed|awk|cp|mv` against `.env`) plus an
approval requirement. Then prove it: ask an agent to read `.env`, record the
block, keep that session excerpt as evidence.

### G2. Single global flag map, no write path, no audit trail
Hermes explicitly scopes these out (TASK-335): operators edit the Firestore doc
in the console, no `PATCH`, no per-user or percentage targeting. The challenge
requires create, list and toggle, so featureflagify adds a write path. The audit
log is not in the Hermes code, so it is new work.

### G3. Hardcoded registry means flags cannot be created at runtime
`FEATURE_FLAGS` is a compile-time constant, and `defaultFlags` and
`envOverrides` are keyed by it. A "create new flag" feature breaks that model,
since a flag created through the API has no compile-time key. See Decision D2.

### G4. Env overrides are build-time only
Both Expo and Vite inline `*_PUBLIC_*` values at build time. State this in the
README; the runtime tier is what covers toggling without a rebuild.

### G5. Test debt in the reference code
Web runtime path (`flagStore`, `useFeatureFlag` precedence) merged with no tests
(TASK-398, `todo`). The only web evidence is a Storybook-driven Cypress spec for
the sidebar. Plan tests alongside the code here.

### G6. Fetch has no timeout
The "slow" case in REL-13 is stated as a requirement, but `fetchFlags` has no
timeout. A hung request keeps `loading = true` and blocks later calls. Add an
`AbortController` timeout.

### G7. Tests mock the whole shared package
Both API test files `jest.mock('@hermes/shared')` with an inline fake `db` and
`ApiError`. With a `FlagRepository` interface this goes away: tests pass an
in-memory repository and need no module mocking, except the resilience test,
which should inject a repository returning a corrupt document.

### G8. Hermes agent prompts depend on Hermes-only MCP servers
`hermes-planning`, `web-scraper`, `gpt` and `file://../../docs/agents/*.md`
paths. Not portable. The featureflagify agents must reference only files inside
this repo.

## 5. Decisions to settle before writing stories

| ID | Question | Hermes behavior | Recommendation |
|----|----------|-----------------|----------------|
| D1 | Precedence order | env override > API > default (a developer can force a flag locally) | **SETTLED (2026-11-18): API > env fallback > code default.** No dev-force override tier (YAGNI). Env values are build-time, so they act as a startup fallback only |
| D2 | Static registry vs dynamic flags | Static (`as const`) | **SETTLED (2026-11-18): option C, dynamic contract with a typed registry per consumer.** `shared` holds the key schema, flag schema and API response types (`Record<string, boolean>` values). Each consumer declares the flags it uses with code defaults in one typed file (for example `defineFlags({ 'new-checkout': false })`), which gives compile-time key checking. Codegen from the API is a documented next step. See section 9 |
| D8 | Delete or archive removed flags | Not applicable (no write path) | **SETTLED (2026-11-18): neither. Disabling is the only off-switch**, matching the challenge scope (view, enable/disable, create). Known limit: a flag created with a typo cannot be removed, only disabled. Future work: archive (hidden from default list, still resolves to its code default), then hard delete behind confirmation and an audit entry |
| D3 | Storage | Firestore doc | `FlagRepository` interface with an in-memory implementation as the example. Name a file-backed or SQLite implementation as a next step only |
| D4 | Test runner | Jest (api), Vitest (web) | Vitest for both, one config style |
| D5 | Source reporting | Not exposed | Return the resolving source (`api`, `env`, `default`) from the UI hook. Cheap and useful for the demo |
| D6 | State holder in UI | Zustand | React context + `useSyncExternalStore` or a small provider. Avoids a dependency for one map. Zustand is fine if reuse is the priority |
| D7 | Planning layer | HermOS-generated planning repo | `featureflagify/planning` created with `hermos init`; keep HermOS output committed, not a runtime dependency (matches HermOS README) |

## 6. Candidate story and task seeds

For the next step, derived from the patterns above. IDs are placeholders.

Stories
1. As an operator, I can list, create and toggle flags (from REL-13 and G2).
2. As a developer, my UI keeps working when the flag API is down (P2, P4, P7, G6).
3. As a developer, one typed contract validates API and UI (P1, P6).
4. As a maintainer, I can swap the storage and HTTP layers (D3, goal 1).
5. As a security reviewer, agents cannot read or write real env files (G1).
6. As an operator, every toggle is recorded with who, when, before and after (G2).

Task seeds (ordered)
1. `shared`: key schema (kebab-case regex), flag schema, `Flag` and `FlagMap`
   types (`Record<string, boolean>` values), tests (P6, D2).
2. `api`: `FlagRepository` + in-memory implementation, `FlagService` with per-key
   validation and safe defaults (P4, P5), tests including the resilience case.
3. `api`: HTTP adapter (one framework), error envelope, request ID, audit log
   (P9, P10).
4. `ui`: `flags.ts` typed registry (`defineFlags`) plus resolver with the
   decided chain API > env > default and source reporting (P2, P3, D1, D2, D5),
   unit tests for every branch.
5. `ui`: provider with fetch, timeout, swallow-and-fall-back (P7, G6), tests.
6. `ui`: flag list, create form, toggle with accessible labeling.
7. `.kiro`: agents, steering, `fs_read`/`fs_write` denied paths and shell
   restrictions (G1), plus the verification session.
8. `docs`: README (reused vs new, tradeoffs, next steps), decisions record.

## 7. Reuse and disclosure notes

- All source is from the owner's workspace. The Hermes repos belong to a
  Red Mars project (`@red-mars-engineering` package scope). Confirm the owner has
  the right to publish derived patterns before copying code. Prefer rewriting
  from the patterns here instead of copying files, and strip names such as
  `hermes`, `Story Points` and `@red-mars-engineering`.
- Do not copy any `.env`, `.env.dev` or `firebase` config. Only `.env.example`
  was read during this survey, which is the allowed exception. `.env` files in
  the Hermes repos were not opened.
- Task files contain internal names (assignee, PR numbers, commit hashes). Do not
  carry those into the public repo.

## 8. Files read during this survey

Types: `src/featureFlags.ts`.
API: `packages/feature-flags/{src/**,__tests__/**,jest.config.ts,package.json,README.md}`,
gateway `routes.ts` (grep), `auth.ts` public routes (grep), `firebase.json` (grep).
Web: `services/featureFlags.ts`, `services/api/featureFlags.ts`,
`stores/flagStore.ts`, `hooks/useFeatureFlag.ts`,
`components/elements/ToggleFeatureFlag/ToggleFeatureFlag.tsx`,
`cypress/e2e/release/feature-flags.cy.ts`, `.env.example`.
Planning: `user-stories/release.md` (REL-13), `tasks/TASK-334, 335, 357, 398`,
`.kiro/steering/{security,test-strategy,delegation}.md`,
`.kiro/agents/hermes-api.json`, `.kiro/kiro-tools.config.json`, `tasks/README.md`.
HermOS: `README.md`.

## 9. Runtime flag keys: research and decision (D2)

Inputs: OpenFeature (flag key is a string, evaluation takes a required default),
Unleash (names are URL-friendly strings, 1 to 100 characters, unique per
instance; lifecycle active, potentially stale, stale), LaunchDarkly (key
conventions must be supported by the SDKs; delete temporary flags after
rollout). Only search-result snippets were read, not the full documentation.

Options considered

| Option | Summary | Why not / why |
|--------|---------|---------------|
| A. Static registry | Hermes today | Cannot create flags at runtime |
| B. Fully dynamic | `Record<string, boolean>` everywhere | Typos resolve silently to the default, no usage inventory |
| **C. Hybrid (chosen)** | Dynamic contract, typed registry per consumer | Compile-time key checking where code uses flags, contract stays reusable |
| D. Codegen | Generate types from the API | Needs build step and CI, out of timebox. Next step |

Consequences of choosing C
- API and `shared` treat keys as validated strings. Unknown key at evaluation
  returns the caller's default with source `default`, never 404.
- A consumer's registry can list flags the API does not have yet, and the API
  can hold flags no consumer declares. The UI should show both states
  (declared but missing in API; present in API but undeclared).
- Env fallback names derive from the key by convention. Vite's
  `import.meta.env` is statically replaced at build time and dynamic lookup
  generally works there. Expo/Metro required literal references, which is why
  Hermes listed each variable. Verify in the UI package before relying on it.

Key format
- Lowercase kebab-case, regex `^[a-z][a-z0-9-]{0,62}[a-z0-9]$`.
- Immutable after creation. Renaming means creating a new flag.
- One-to-one env mapping: `new-checkout` -> `VITE_FF_NEW_CHECKOUT`. Allowing
  `_` or `.` would make `new-checkout` and `new_checkout` collide.
- Duplicate key on create returns 409.

Settled: D8. No delete or archive in this iteration; disable only. Both are
listed as future work.

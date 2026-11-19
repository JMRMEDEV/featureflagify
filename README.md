# Featureflagify

Feature flag service with an API-first, env-fallback, code-default resolver for consumers.

Layout and decisions: [planning/docs/ARCHITECTURE.md](planning/docs/ARCHITECTURE.md).

## Quick start

Requires Node 20.19.4 (`.nvmrc`). From a fresh clone:

```text
npm install
npm test
npm run typecheck
npm run lint
```

Then follow the [demo](#demo-api-first-env-fallback-code-default) to see the fallback.

## Reused versus new

The survey of the existing code, with the patterns kept and the gaps found, is in
[docs/research/codebase-patterns.md](docs/research/codebase-patterns.md).

- **From my own earlier personal project:** patterns, rewritten for this one. The fixed
  precedence chain and tri-state env parsing, safe defaults and a map that never returns 404,
  validating each stored record on its own so one bad value cannot disable every flag, a fetch
  failure that falls back instead of blocking, the handler and service split, structured logs
  with event names, test tiers, and the agent, steering and skill setup.
- **From HermOS (`libs/hermOS`, a read-only copy):** my own planning workflow. It scaffolded
  `planning/` with stories, tasks, indexes and the audit script. It is not a runtime dependency.
- **Built for this project:** the `FlagRepository` interface and in-memory repository, the audit
  log, dynamic keys with a typed registry per consumer, the shared Zod contract and env-name
  helper, the Fastify adapter, the UI resolver, provider, fetch timeout and management screen,
  source reporting, and the tests and evidence.
- **Gaps in the earlier code, fixed here:** it had no fetch timeout, no write path, no audit
  trail, tests that mocked the whole shared package, and env protection that only covered file
  reads.

Clock: measured from the first TASK-001 commit (2026-11-18 16:46 -0600) to the commit that
marked TASK-010 done (17:55 -0600), about 1 hour 9 minutes. It covers the build and the demo
evidence. It does not include the earlier research and planning scaffold, nor the README, the
AI session curation (TASK-012) or this write-up.

## Role and approach

I was the architect. I took the requirements, set the goals, and chose the first tech stack,
scope and architecture. I also brought the skills, steering and agents I trusted from my own
work, and reused parts of my own codebase. AI agents sped up the build so I did not have to
reinvent them.

AI acted as a software-architecture consultant. It checked my expectations and goals against
the original requirements and helped me size the scope to the constraints. A multi-agent
workflow did the building: one agent per domain (`shared`, `api`, `ui`), a QA agent and a
planner. HermOS, my existing workflow, scaffolded the project management.

I also reviewed the code and ran the manual QA myself.

What I would do differently: down-scope the whole project. Kiro over-engineered things in
places, and too much time went into setting up agents instead of building features.

## Assumptions and decisions

Product intent is in [VISION.md](planning/docs/VISION.md), wire formats in
[CONTRACTS.md](planning/docs/CONTRACTS.md), and the decision register (D1 to D11) in
[ARCHITECTURE.md](planning/docs/ARCHITECTURE.md#decision-register).

- A flag the system does not know about resolves to the consumer's code default. Resolution
  order is API, then env, then code default, and every value reports its source.
- Keys are dynamic in the contract and typed per consumer through a registry.
- Disable is the only off-switch.
- Storage and the HTTP framework sit behind interfaces: `FlagRepository` and one Fastify adapter.
- API and UI validate against the same Zod schemas in `shared`.

## Tradeoffs chosen on purpose

| Choice | Why |
|--------|-----|
| In-memory repository and audit log | The interface is the point. A persistent repository is a small follow-up |
| Boolean flags only | Targeting and rollouts change the evaluation model and would double the surface to review |
| One HTTP adapter | One adapter plus a clean seam shows the idea without a second framework |
| A failed refresh drops to env and defaults, not to stale API values | Simple and predictable. Caching last-known values needs a storage and invalidation policy |
| Flag stored first, then the audit entry | An audit entry for a change that never happened is worse than a change that lacks one. Needs a transactional store to make both atomic |

Not built: targeting and percentage rollouts, multiple environments, authentication and
roles, persistent storage, delete and archive, cached last-known values, a second HTTP
adapter, typed codegen from the API, an audit history view in the UI, and browser E2E
tests. Reasons are in the "Deliberately not built" table in
[ARCHITECTURE.md](planning/docs/ARCHITECTURE.md).

## Known limits

- Env fallback values are fixed at build time. They are a startup fallback, not a live control.
  Every `VITE_` variable present at build ends up in the bundle, so secrets never use that prefix.
- No delete or archive. A flag created with a typo cannot be removed, only disabled.
- No authentication. `x-actor` is recorded in the audit log but not trusted.
- Data lives in memory and is lost when the API restarts.
- If the audit write fails after a flag change, the change stays stored and the request returns a 500.
- A corrupt stored record is left out of lists and cannot be repaired through the API.
- Unknown routes return 404 `FLAG_NOT_FOUND`, because the contract has no dedicated code yet.
- Fastify pulls a dependency that declares Node 22 or later. It works on Node 20.19.4, and npm prints an engine warning.
- The agent security rules (TASK-002) were reviewed on paper only. The enforcement tests were not run.

## With another day, in priority order

1. A persistent repository and audit store, with an atomic write of both.
2. Cached last-known values for consumers (RES-03).
3. Delete or archive, so a mistyped flag can be removed.
4. A `ROUTE_NOT_FOUND` error code.
5. Authentication and a trusted actor.
6. An audit history view in the UI.
7. Typed registry codegen from the API.
8. Run the agent enforcement tests (TASK-002) and fix the review findings.
9. Decide on Node 22 and newer test tooling.

## How AI was used

Work was split between role-specific agents defined in `.kiro/agents/`. A planner agent
broke the work into tasks and delegated. Separate agents owned `shared/`, `api/` and `ui/`,
and a QA agent verified and wrote evidence. Only the planner ran git, one commit at a time
after the owner approved the file list and message.

- **Delegated:** all product code, tests and evidence, within path ownership rules.
- **Corrected by the owner or planner:**
  - The agents pinned different TypeScript versions, and the planner had one package aligned.
  - An agent ran `npx vitest -w ...`, where `-w` means watch, and the command hung for 10 minutes.
  - The owner removed a keyboard-only requirement as out of scope, and the leftover dependency was removed.
  - The first QA pass could not run the fresh-clone check, and the owner deferred it.
- **Verified by:** typecheck, lint and tests after each task, mutation proofs (break a rule, see a
  test fail, restore), a curl run against the real server, and code review and a manual browser walkthrough by the owner.
- **Not verified:** agent enforcement of the env-file rules (TASK-002, deferred) and a fresh-clone install.

Curated sessions: pending TASK-012.

## Commands

Node version is pinned in `.nvmrc`.

| Command | Meaning |
|---------|---------|
| `npm install` | install all workspaces |
| `npm run dev` | start workspaces that define `dev` |
| `npm test` | tests in every package |
| `npm run typecheck` | typecheck every package |
| `npm run lint` | lint every package |

## Consumer env variables

Names come from [planning/docs/CONTRACTS.md](planning/docs/CONTRACTS.md). Create your own
`.env.example` and `.env.local`; real `.env` files are not committed.

| Variable | Meaning |
|----------|---------|
| `VITE_FLAGS_API_URL` | Base URL of the flag API |
| `VITE_FLAGS_TIMEOUT_MS` | Fetch timeout, default 2000 |
| `VITE_FF_<KEY>` | Fallback value for one flag: `true`, `1`, `false` or `0`. Other values are ignored |

## API env variables

| Variable | Meaning |
|----------|---------|
| `FLAGS_API_PORT` | Port the server listens on, default 3001. Binds to `127.0.0.1` |
| `FLAGS_CORS_ORIGIN` | Allowed UI origin, default `http://localhost:5173`. One exact origin, no wildcard |

## Demo: API first, env fallback, code default

The UI declares three flags in `ui/src/app-flags.ts`: `new-checkout` (default off),
`dark-banner` (default on) and `beta-search` (default off). Run each command from the
repository root, in separate terminals. Configuration goes on the command line only.

1. Start the API: `FLAGS_API_PORT=3001 FLAGS_CORS_ORIGIN=http://localhost:5173 npm run dev -w api`
2. Start the UI: `VITE_FLAGS_API_URL=http://127.0.0.1:3001 VITE_FF_BETA_SEARCH=true npm run dev -w ui`
3. Open `http://localhost:5173`. No flags exist yet, so the "Flags this app declares" table
   shows `default` for `new-checkout` and `dark-banner`, and `env` for `beta-search`.
4. Create `new-checkout` and switch it on. Use the exact declared keys: any other key is
   shown as `undeclared`, and the declared rows keep saying "Missing from API". Its row now shows On with source `api`.
5. Stop the API and reload. The page still loads, a banner says the API is unavailable,
   and create and toggle controls are disabled. `new-checkout` falls back to `default`,
   `beta-search` stays `env`, and no row shows `api`.
6. Restart the API and click Retry in the banner. Data is in memory, so it comes back
   empty. Create and switch on `new-checkout` again and its row shows `api` again.

The full step list with expected results is in
[docs/evidence/TASK-010/manual-walkthrough.md](docs/evidence/TASK-010/manual-walkthrough.md).
The same three states, run against the real API with the production resolver, are in
[docs/evidence/TASK-010/demo.md](docs/evidence/TASK-010/demo.md).


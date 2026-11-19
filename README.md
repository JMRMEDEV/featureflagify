# Featureflagify

Feature flag service with an API-first, env-fallback, code-default resolver for consumers.

Layout and decisions: [planning/docs/ARCHITECTURE.md](planning/docs/ARCHITECTURE.md).

## What this submission is

This is a take-home exercise (option 3, Feature Flag Manager), and I used it to show **how I
work with AI agents end to end**, not to show that I can hand-write a flag service. That was a
deliberate choice, based on the survey I answered for the same opportunity: it makes claims about
AI-assisted delivery, and I wanted the repository to be the evidence.

- **I did not hand-write the product code, and I did not stand back from it either.** The
  requirements, goals, scope, architecture and every decision are mine, and so is the agent
  setup that constrained the work. The agents wrote the product code, tests and evidence, inside
  path-ownership rules I defined. I reviewed that code, corrected it where it was wrong, and ran
  the manual QA myself (see [What I did myself](#what-i-did-myself)).
- **The process is part of the deliverable.** Stories, tasks, decisions, agent definitions,
  steering, skills, QA reports and the manual walkthrough are all committed.
- **Judge it as a first iteration of something a team would keep building**, as the brief says,
  and as an example of an AI workflow, not as a hand-crafted codebase.

| Survey topic | Where to look |
|--------------|---------------|
| A real feature delivered end to end with AI, in small tasks | [planning/tasks/](planning/tasks/INDEX.md): 12 tasks with dependencies, one agent owner per path. `git log` shows one task per commit group |
| AI writing and fixing tests | 252 tests written by agents (see [Checks](#checks)); mutation proofs in [docs/evidence/](docs/evidence/) |
| Validating AI-generated code | [Corrected by the owner or planner](#how-ai-was-used) and the QA review of the agent config, [config-review.md](docs/evidence/TASK-002/config-review.md), which lists 8 defects found in my own agent rules |
| Getting a new repository running | [Quick start](#quick-start) and the [demo](#demo-api-first-env-fallback-code-default) |
| Working from unclear requirements | The brief is open. I wrote the [vision](planning/docs/VISION.md), stories and a [decision register](planning/docs/ARCHITECTURE.md#decision-register) before any code |
| Offering alternatives to a requirement | [Research note](docs/research/codebase-patterns.md): the runtime-keys decision (D2) compared four options before one was chosen |
| Multi-agent workflow | [.kiro/agents/](.kiro/agents/), prompts in [docs/agents/](docs/agents/), ownership and delegation rules in [.kiro/steering/](.kiro/steering/) |

Not shown: CI/CD configuration. The brief said it was not needed, and I did not build any.

## Quick start

Requires Node 20.19.4 (`.nvmrc`). From a fresh clone:

```text
npm install
npm test
npm run typecheck
npm run lint
```

Then follow the [demo](#demo-api-first-env-fallback-code-default) to see the fallback.

## Repository map

```text
api/        flag service: framework-free core + one Fastify adapter
ui/         Vite + React client: typed registry, resolver, provider, management screen
shared/     Zod schemas and types used by api and ui
planning/   stories, tasks, decisions, contracts (generated and audited with HermOS)
docs/       research, agent prompts, and evidence per task
.kiro/      agents, steering and skills
libs/       read-only copy of HermOS, so a reader can see what generated planning/
```

## Time

The brief asks for no more than 60 minutes. **This went over, and I am stating it plainly.**

| When (2026-11-18, -0600) | What | Elapsed |
|---------------------------|------|---------|
| 15:45 | First design conversation: choose the feature, scope and stack. No code | |
| about 16:00 to 16:38 | Research of my earlier code, HermOS scaffold, stories, tasks, agents, steering, skills | about 55 min with the design talk |
| 16:46 to 17:55 | Build and demo evidence, from the first TASK-001 commit to the commit that marked TASK-010 done | **1 h 9 min** |
| 17:55 to 18:05 | README | |

From the first conversation to the demoed feature is about 2 h 10 min. The 60 minutes in the brief
would be covered only by the build, and even that was 9 minutes over. The preparation was disclosed
as preparation, but it was real time. The eight commits dated 16:38 are the prepared material,
committed together at the end of that phase. Their time is when they were committed, not when they
were written. The curated session logs that back these times are pending (TASK-012).

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

## Role and approach

I was the architect. I took the requirements, set the goals, and chose the first tech stack,
scope and architecture. I also brought the skills, steering and agents I trusted from my own
work, and reused parts of my own codebase. AI agents sped up the build so I did not have to
reinvent them.

AI acted as a software-architecture consultant. It checked my expectations and goals against
the original requirements and helped me size the scope to the constraints. A multi-agent
workflow did the building: one agent per domain (`shared`, `api`, `ui`), a QA agent and a
planner. HermOS, my existing workflow, scaffolded the project management.

### What I did myself

- Chose the feature, the scope, the stack and the layout, and made the settled decisions: API
  first, then env, then code default (D1); keys created at runtime with a typed registry per
  consumer (D2); disable as the only off-switch (D8).
- Brought my own HermOS planning workflow, agent definitions, steering and skills, and set the
  ownership, git and env-file rules the agents work under.
- Approved the stories, tasks and decisions before any code was written, and approved the file
  list and message of each commit.
- Reviewed the code the agents wrote, and corrected the agents when they were wrong (see
  [How AI was used](#how-ai-was-used)).
- Ran the manual QA in the browser. It showed that a tester who creates a flag with a new key
  still sees every declared flag as "Missing from API". That led to the
  [How a flag becomes behavior](#how-a-flag-becomes-behavior) section and to the one-click
  "Create" item on the list below.

What I would do differently:

- Down-scope the whole project. Kiro over-engineered things in places, and too much time went
  into setting up agents instead of building features.
- Time-box the preparation as strictly as the build. The setup phase ran longer than the
  feature work it was meant to speed up.

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

## How a flag becomes behavior

Operators and developers each do one part, and the management screen shows where they disagree.

1. **Operator (no code):** creates a flag with a key such as `dark-banner` and switches it on or
   off, in the UI or through the API.
2. **Developer (code, once per flag):** declares the key and its code default in the app's
   registry, and reads it where it matters:

   ```ts
   // ui/src/app-flags.ts
   defineFlags({ 'dark-banner': true });
   // in a component
   const { value, source } = useFlag('dark-banner');
   ```

   Reading an undeclared key fails typecheck, which is the point of the typed registry.
   Declaring a key also gives it its `VITE_FF_DARK_BANNER` env fallback and its code default.
3. **The two can disagree, and both are valid:**
   - A flag created in the API that no code declares is marked `undeclared`. It has no effect on
     the app until a developer reads it.
   - A flag declared in code but not created in the API is marked "Missing from API". The app
     uses its env fallback or code default.

A flag only changes behavior when both halves exist. This is the cost of compile-time key
checking, and it matches how typed flag SDKs work: the application names the key at the call
site. Generating the registry from the API would remove the manual step and is on the list below.

## Tradeoffs chosen on purpose

| Choice | Why |
|--------|-----|
| In-memory repository and audit log | The interface is the point. A persistent repository is a small follow-up |
| Boolean flags only | Targeting and rollouts change the evaluation model and would double the surface to review |
| One HTTP adapter | One adapter plus a clean seam shows the idea without a second framework |
| A failed refresh drops to env and defaults, not to stale API values | Simple and predictable. Caching last-known values needs a storage and invalidation policy |
| Flag stored first, then the audit entry | An audit entry for a change that never happened is worse than a change that lacks one. Needs a transactional store to make both atomic |
| Typed registry per consumer, not fully dynamic keys | Typos fail the build. Costs a code step per flag (see above) |

Not built: targeting and percentage rollouts, multiple environments, authentication and
roles, persistent storage, delete and archive, cached last-known values, a second HTTP
adapter, typed codegen from the API, an audit history view in the UI, CI/CD, and browser E2E
tests. Reasons are in the "Deliberately not built" table in
[ARCHITECTURE.md](planning/docs/ARCHITECTURE.md).

## Known limits

- Env fallback values are fixed at build time. They are a startup fallback, not a live control.
  Every `VITE_` variable present at build ends up in the bundle, so secrets never use that prefix.
- No delete or archive. A flag created with a typo cannot be removed, only disabled.
- No authentication. `x-actor` is recorded in the audit log but not trusted.
- Data lives in memory and is lost when the API restarts.
- If the audit write fails after a flag change, the change stays stored, the failure is logged as
  `audit_append_failed`, and the request returns a 500.
- A corrupt stored record is left out of lists and cannot be repaired through the API.
- Unknown routes return 404 `FLAG_NOT_FOUND`, because the contract has no dedicated code yet.
- Fastify pulls a dependency (`cookie@2`) that declares Node 22 or later. It works on Node 20.19.4,
  and npm prints an engine warning.
- **Agent env-file rules are only partly verified (TASK-002 is open).** All `.env*` files are
  hard-blocked for every agent. A QA review of the configuration found 8 defects, none fixed
  ([config-review.md](docs/evidence/TASK-002/config-review.md)). I probed the tool-level rules
  by hand on a scratch copy with kiro-cli 2.20.1: reads of `.env*` and shell commands that name an
  env file were denied, and a legitimate `grep import.meta.env` still ran. The same probe found
  that `deniedCommands` matches the whole command string, so every pattern needs a `(?s).*`
  wrapper. The final write rule was not re-run. Details and limits are in
  [.kiro/steering/security.md](.kiro/steering/security.md). That probe is not saved as task
  evidence.

## With another day, in priority order

1. A persistent repository and audit store, with an atomic write of both.
2. Cached last-known values for consumers (RES-03).
3. Delete or archive, so a mistyped flag can be removed.
4. Close TASK-002: record the enforcement tests as evidence and fix the review findings.
5. A one-click "Create" on declared flags that are missing from the API.
6. A `ROUTE_NOT_FOUND` error code.
7. Authentication and a trusted actor.
8. An audit history view in the UI.
9. Typed registry codegen from the API.
10. A `commit-msg` hook that enforces the commit format, and CI.
11. Decide on Node 22 and newer test tooling.

## How AI was used

Work was split between role-specific agents defined in `.kiro/agents/`. A planner agent
broke the work into tasks and delegated. Separate agents owned `shared/`, `api/` and `ui/`,
and a QA agent verified and wrote evidence. The planner ran git after the owner approved the
file list and message. The one exception is the first eight preparation commits, which were
made in a single batch at the owner's request.

Standing rules the agents load (see [agent-rules](planning/agent-rules/README.md)):
ownership by path, no git for anyone but the planner, hard block on env files, evidence before a
task is called done, a TypeScript typecheck loop after every file (skill `typescript-validation`),
and one-line Conventional Commits of at most 50 characters (skill `conventional-commits`).

- **Delegated:** all product code, tests and evidence, within path ownership rules.
- **Corrected by the owner or planner:**
  - The agents pinned different TypeScript versions, and the planner had one package aligned.
  - An agent ran `npx vitest -w ...`, where `-w` means watch, and the command hung for 10 minutes.
  - The owner removed a keyboard-only requirement as out of scope, and the leftover dependency was removed.
  - The first QA pass could not run the fresh-clone check, and the owner deferred it.
  - My first version of the shell deny rules blocked nothing, because the matcher needs the whole
    command string to match. A live probe caught it, and the patterns were rewritten.
- **Verified by:** typecheck, lint and tests after each task, mutation proofs (break a rule, see a
  test fail, restore), a curl run against the real server, and my own code review and manual
  browser walkthrough.
- **Not verified:** the final write rule for env files, the review findings of TASK-002, and a
  fresh-clone install.

Curated sessions: pending TASK-012.

## Checks

At the time of writing (2026-11-18, about 18:10): 252 tests pass (51 in `shared`, 108 in `api`,
93 in `ui`), and `npm run typecheck` and `npm run lint` both exit 0 on Node 20.19.4. Run on the
working copy, not on a fresh clone.

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
`.env.example` and `.env.local`; real `.env` files are not committed, and agents cannot read or
write any `.env*` file.

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
   shows `default` for `new-checkout` and `dark-banner`, and `env` for `beta-search`. All three
   say "Missing from API". That is expected at this point.
4. Create `new-checkout` and switch it on. Use the exact declared keys: any other key (for
   example `dark-mode`) is created fine and shown as `undeclared`, but no declared row changes,
   because no code reads it. The `new-checkout` row now shows On with source `api`.
5. Stop the API and reload. The page still loads, a banner says the API is unavailable,
   and create and toggle controls are disabled. `new-checkout` falls back to `default`,
   `beta-search` stays `env`, and no row shows `api`.
6. Restart the API and click Retry in the banner. Data is in memory, so it comes back
   empty. Create and switch on `new-checkout` again and its row shows `api` again.

The full step list with expected results is in
[docs/evidence/TASK-010/manual-walkthrough.md](docs/evidence/TASK-010/manual-walkthrough.md).
The same three states, run against the real API with the production resolver, are in
[docs/evidence/TASK-010/demo.md](docs/evidence/TASK-010/demo.md).

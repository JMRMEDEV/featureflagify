# TASK-010 fallback demonstration (automated part)

Node v20.19.4. Run on 2026-11-18 from the repository root. No browser was used. The real
API ran over real HTTP on `127.0.0.1:38520`. The resolver is the production
`resolveFlags` and the registry is the production `registry` from `ui/src/app-flags.ts`
(`new-checkout` default false, `dark-banner` default true, `beta-search` default false).

What the script (`demo.mts`) does for real: real `fetch` to the real server,
`evaluateResponseSchema` from `@featureflagify/shared`, `resolveFlags(registry, api, env)`.
What it re-implements: the few lines of the provider's private `loadFlags` (fetch, schema
parse, `undefined` on any failure). It does not render React, so the banner and buttons
are not covered here (see `manual-walkthrough.md`).

Server start (variables on the command line only, run from `api/`, output to a log file):

```text
FLAGS_API_PORT=38520 FLAGS_CORS_ORIGIN=http://localhost:5173 ../node_modules/.bin/tsx src/server.ts > api.log 2>&1 &
```

Script commands (from the repo root, with the already installed `tsx`):

```text
node_modules/.bin/tsx docs/evidence/TASK-010/demo.mts http://127.0.0.1:38520 seed
node_modules/.bin/tsx docs/evidence/TASK-010/demo.mts http://127.0.0.1:38520 resolve
```

The script is `.mts` in `docs/evidence/`, outside every package's Vitest include glob
(`ui`: `src/**/*.test.{ts,tsx}`), so `npm test` does not run it.

## State 1: API running, flags created and toggled, source `api`

`seed` goes through the real management endpoints (`POST /flags`, `PATCH /flags/:key`).
`new-checkout` is created (false) then enabled. `dark-banner` is created enabled, then
disabled. `beta-search` is never created.

```text
POST /flags {"key":"new-checkout"} -> 201
PATCH /flags/new-checkout {"enabled":true} -> 200
POST /flags {"key":"dark-banner","enabled":true} -> 201
PATCH /flags/dark-banner {"enabled":false} -> 200
```

`resolve`:

```text
no env values
  api map: {"dark-banner":false,"new-checkout":true}
  new-checkout  {"value":true,"source":"api"}
  dark-banner   {"value":false,"source":"api"}
  beta-search   {"value":false,"source":"default"}

env VITE_FF_BETA_SEARCH=true
  new-checkout  {"value":true,"source":"api"}
  dark-banner   {"value":false,"source":"api"}
  beta-search   {"value":true,"source":"env"}

env VITE_FF_NEW_CHECKOUT=false (API present: API must win)
  new-checkout  {"value":true,"source":"api"}
  dark-banner   {"value":false,"source":"api"}
  beta-search   {"value":false,"source":"default"}
```

Both toggled values differ from the code default (`new-checkout` false to true,
`dark-banner` true to false), so `api` is not a coincidence. The last block shows the API
beating a conflicting env value. Cross-check with curl: `GET /evaluate` returned
`{"data":{"flags":{"dark-banner":false,"new-checkout":true}}}`.

## State 2: API stopped, env then default

```text
$ kill -TERM <pid of the tsx parent>        (stopped by PID, no pkill)
server log: {"signal":"SIGTERM","event":"server_stopping"}
$ ss -ltn | grep 38520                      -> no output (no listener)
$ ps -p <pids>                              -> processes gone
$ curl -sS -m 3 http://127.0.0.1:38520/health
curl: (7) Failed to connect to 127.0.0.1 port 38520 after 0 ms: Connection refused
```

`resolve` (the real `fetch` rejects, so the API map is `unavailable`):

```text
fetch failed: fetch failed

no env values
  api map: unavailable
  new-checkout  {"value":false,"source":"default"}
  dark-banner   {"value":true,"source":"default"}
  beta-search   {"value":false,"source":"default"}

env VITE_FF_BETA_SEARCH=true
  api map: unavailable
  new-checkout  {"value":false,"source":"default"}
  dark-banner   {"value":true,"source":"default"}
  beta-search   {"value":true,"source":"env"}

env VITE_FF_NEW_CHECKOUT=false
  api map: unavailable
  new-checkout  {"value":false,"source":"env"}
  dark-banner   {"value":true,"source":"default"}
  beta-search   {"value":false,"source":"default"}
```

The API values from state 1 are gone (no stale values), the flag with a `VITE_FF_` value
shows `env`, and the others show `default`. (In the script output the third block is
titled "API present: API must win". The title only applies to state 1.)

## State 3: API restarted, source `api` again

The same start command ran again. The in-memory data is empty after a restart.

```text
resolve (right after restart, before recreating anything)
  api map: {}
  new-checkout  {"value":false,"source":"default"}
  dark-banner   {"value":true,"source":"default"}
  beta-search   {"value":false,"source":"default"}
```

The API is up but holds no flags, so every flag falls through to `default` (the UI shows
`ok` state with "Missing from API" in that case). After recreating and toggling the flags
with `seed`:

```text
POST /flags {"key":"new-checkout"} -> 201
PATCH /flags/new-checkout {"enabled":true} -> 200
POST /flags {"key":"dark-banner","enabled":true} -> 201
PATCH /flags/dark-banner {"enabled":false} -> 200

resolve
  api map: {"dark-banner":false,"new-checkout":true}
  new-checkout  {"value":true,"source":"api"}
  dark-banner   {"value":false,"source":"api"}
  beta-search   {"value":false,"source":"default"}
```

The server was stopped again by PID (`server_stopping` logged) and `ss -ltn | grep 38520`
printed nothing.

## Production build: `VITE_FF_` value is in the bundle

```text
$ VITE_FF_BETA_SEARCH=true VITE_FLAGS_API_URL=http://127.0.0.1:38520 timeout 300 npm run build -w ui
vite v8.3.8 building client environment for production...
✓ 127 modules transformed.
dist/assets/index-uSvDphzy.js   320.06 kB │ gzip: 97.48 kB
✓ built in 112ms                                                  (exit 0)

$ grep -o 'VITE_FF_BETA_SEARCH[^,}]*' ui/dist/assets/*.js
VITE_FF_BETA_SEARCH:`true`
$ grep -o 'VITE_FLAGS_API_URL:[^,}]*' ui/dist/assets/*.js
VITE_FLAGS_API_URL:`http://127.0.0.1:38520`
```

`ui/dist` was deleted afterwards. This confirms the Vite dynamic env note in
ARCHITECTURE.md for the production bundle: the `import.meta.env` object holds the
variable, which the resolver reads by name at runtime. It does not prove how the screen
renders it.

## Cleanup and final checks

```text
ss -ltn | grep 38520        -> no output (port closed)
ps aux | grep '[s]erver.ts' -> no output (no server process left)
npm run typecheck           exit 0
npm run lint                exit 0
npm test                    exit 0   (shared 51, api 108, ui 93 tests; demo.mts not picked up)
```

## Not run, on purpose

- Browser rendering of the banner, the Retry button, the switch and the Source column
  (no browser available). Steps for the owner are in `manual-walkthrough.md`.
- The README demo section (acceptance criterion 4). The README has no demo section yet,
  and it is a planner-owned file. Reported as open.
- Mutation proof: this is an evidence script, not a test. The contrast between the
  states (same script, same resolver, different output with the server up and down) is
  its own proof that it reacts to the behavior. `resolveFlags` branches are covered by
  committed tests.

# Featureflagify

Feature flag service with an API-first, env-fallback, code-default resolver for consumers.

Layout and decisions: [planning/docs/ARCHITECTURE.md](planning/docs/ARCHITECTURE.md).

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


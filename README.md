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

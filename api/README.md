# API

Flag service with one example HTTP adapter (Fastify). Wire formats, status codes and
error codes are in [planning/docs/CONTRACTS.md](../planning/docs/CONTRACTS.md). Layers
and decisions are in [planning/docs/ARCHITECTURE.md](../planning/docs/ARCHITECTURE.md).

## Run

Node version is pinned in `.nvmrc`.

| Command | Meaning |
|---------|---------|
| `npm run dev -w api` | start with file watching (`tsx watch`) |
| `npm run start -w api` | start once |
| `npm test -w api` | tests (Vitest, Fastify `inject`) |

The server binds to `127.0.0.1`. Data is in memory and is lost on restart.

## Env variables

| Variable | Meaning |
|----------|---------|
| `FLAGS_API_PORT` | Port to listen on, default 3001. An invalid value stops the server at startup |
| `FLAGS_CORS_ORIGIN` | The one allowed UI origin, default `http://localhost:5173`. Must be a bare `http(s)` origin without a path or trailing slash. No wildcard. An invalid value stops the server at startup |

## Endpoints

Success bodies are `{ data: ... }`. Errors are `{ error: { code, message, requestId, details? } }`.

| Method and path | Success | Errors |
|-----------------|---------|--------|
| `GET /health` | 200 | |
| `GET /flags` | 200 | |
| `POST /flags` | 201 | 400, 409 |
| `PATCH /flags/:key` | 200 | 400, 404 |
| `GET /evaluate` | 200, never 404 | |
| `GET /audit?flag=<key>` | 200 | 400 |

Any request can also return 500 `INTERNAL_ERROR` with a generic message. A route the
contract does not define returns 404 `FLAG_NOT_FOUND` with the message `Route not found`.

Headers: `x-request-id` (accepted if 1-128 printable characters, else generated, always
returned) and `x-actor` (optional, 1-100 characters, checked on `POST` and `PATCH`).

## Layout

```text
src/
  flag-service.ts, errors.ts          core rules, no HTTP framework
  flag-repository.ts, audit-log.ts    storage interfaces
  in-memory-*.ts                      in-memory implementations
  logger.ts, json-logger.ts           Logger interface and the one JSON implementation
  config.ts                           reads and validates the env variables
  http/                               the Fastify adapter: parsing, error mapping, CORS
  server.ts                           composition root: builds everything and listens
```

## Add another repository

1. Create `src/<name>-flag-repository.ts` implementing `FlagRepository`
   (`src/flag-repository.ts`). Reads return `unknown`. The service validates them.
2. Do the same for `AuditLog` (`src/audit-log.ts`) if audit entries move too.
3. In `src/server.ts`, replace `new InMemoryFlagRepository()` and `new InMemoryAuditLog()`
   with the new classes. No other file changes. `FlagService` and `src/http/` stay as they are.

## Add another adapter

1. Create a folder beside `src/http/`, for example `src/express/`.
2. Build its app from a `FlagService`, an `AuditLog` and a `Logger`. Parse every request
   with the schemas in `@featureflagify/shared`, call the service, and map `FlagExistsError`
   and `FlagNotFoundError` (`src/errors.ts`) to the error envelope. Keep flag rules out of it.
3. Pass `currentRequestFields` from `src/http/request-context.ts` as the logger's `context`,
   or write an equivalent, so the service's log lines carry the request id.
4. Start it from a new entry file or from `src/server.ts`.

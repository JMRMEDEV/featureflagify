# Contracts

The schemas below are implemented once in `shared` and imported by `api` and
`ui`. See [ARCHITECTURE.md](ARCHITECTURE.md) for the reasoning.

## Flag key

- Lowercase kebab-case: `^[a-z][a-z0-9-]{0,62}[a-z0-9]$`. This means 2 to 64 characters.
- Unique. Immutable after creation. A rename means a new flag.
- Env name derived from the key: `new-checkout` becomes `VITE_FF_NEW_CHECKOUT`.
  The restricted character set keeps this mapping one-to-one.

## Flag

```ts
type Flag = {
  key: string;            // flag key, see above
  name: string;           // 1-100 characters, defaults to the key
  description: string;    // 0-500 characters
  enabled: boolean;
  createdAt: string;      // ISO 8601 UTC, `Z` suffix, no offsets
  updatedAt: string;      // ISO 8601 UTC, `Z` suffix, no offsets
};
```

## Audit entry

```ts
type AuditEntry = {
  id: string;             // non-empty
  flagKey: string;
  action: 'created' | 'enabled' | 'disabled';
  before: boolean | null; // null on creation
  after: boolean;
  actor: string;          // 1-100 characters, x-actor header, "anonymous" when absent
  requestId: string;      // non-empty
  at: string;             // ISO 8601 UTC, `Z` suffix, no offsets
};
```

## Endpoints

Management and evaluation are separate. Management is for operators.
Evaluation is for applications and returns only values.

| Method and path | Purpose | Success | Errors |
|-----------------|---------|---------|--------|
| `GET /flags` | List flags, newest first | `200 { data: { flags: Flag[] } }` | |
| `POST /flags` | Create a flag. Body: `{ key, name?, description?, enabled? }` | `201 { data: { flag: Flag } }` | `400 VALIDATION_ERROR`, `409 FLAG_EXISTS` |
| `PATCH /flags/:key` | Enable or disable. Body: `{ enabled: boolean }` | `200 { data: { flag: Flag } }` | `400 VALIDATION_ERROR`, `404 FLAG_NOT_FOUND` |
| `GET /evaluate` | Map of every flag value | `200 { data: { flags: Record<string, boolean> } }` | |
| `GET /audit` | Audit entries, newest first, optional `?flag=<key>` | `200 { data: { entries: AuditEntry[] } }` | `400 VALIDATION_ERROR` |
| `GET /health` | Liveness | `200 { data: { status: "ok" } }` | |

Evaluation rules
- `GET /evaluate` never returns 404. A key absent from the map is unknown, and
  the consumer applies its env fallback and code default.
- A toggle to the current value is accepted and does not write an audit entry.

## Error envelope

```json
{ "error": { "code": "FLAG_EXISTS", "message": "A flag with this key already exists", "requestId": "…", "details": [] } }
```

`details` is present only for `VALIDATION_ERROR` and is a list of
`{ field: string, message: string }`, one per failing field.

The `code` values are `VALIDATION_ERROR`, `FLAG_EXISTS` and `FLAG_NOT_FOUND`. Request
bodies and the audit query are strict: unknown fields fail with `VALIDATION_ERROR`.
`?flag=` is validated with the flag key schema.

## Headers

| Header | Direction | Rule |
|--------|-----------|------|
| `x-request-id` | request and response | Accepted if it is 1-128 printable characters, else replaced. Always returned |
| `x-actor` | request | Optional, 1-100 characters. Recorded in the audit log. Not authenticated |

## Consumer env variables

| Variable | Meaning |
|----------|---------|
| `VITE_FLAGS_API_URL` | Base URL of the flag API |
| `VITE_FLAGS_TIMEOUT_MS` | Fetch timeout, default 2000 |
| `VITE_FF_<KEY>` | Fallback value for one flag: `true`, `1`, `false` or `0`. Other values are ignored |

The variable names are listed here and in the README. The owner maintains
`.env.example`; agents cannot read or write any `.env*` file. Real `.env` files are not
committed and are off limits to agents.

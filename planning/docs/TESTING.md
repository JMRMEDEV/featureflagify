# Testing policy

Match verification to risk, as in the source project's test strategy. Time is
limited, so effort goes where a regression costs the most.

## Tiers

| Package | Style | Must cover |
|---------|-------|------------|
| `shared` | Unit (Vitest) | Key schema accepts and rejects the documented cases. Flag and request schemas reject bad input |
| `api` core | Unit (Vitest), in-memory repository, no module mocking | Create, list, toggle, evaluate. Duplicate key. Unknown key. Audit entry written once per real change and not for a no-op toggle. A corrupt stored record affects only that key and logs `flag_invalid_record` |
| `api` adapter | Unit through the framework's inject helper | Status code and body for every outcome in [CONTRACTS.md](CONTRACTS.md). Error envelope shape. Request id echoed and generated. Rejected requests write nothing |
| `ui` resolver | Unit | Every branch: API value, env fallback, code default, each with the reported source. Env parsing for `true`, `1`, `false`, `0` and invalid values |
| `ui` provider | Unit with a mocked `fetch` | Success, network failure, non-2xx, invalid body, timeout. The app keeps resolving values in every failure case |
| `ui` screen | A few component tests | Create form validation, toggle state and announcement, error display |

## Not tested, on purpose

- End-to-end browser tests. The behaviors that matter are covered by the unit
  tiers, and the fallback is demonstrated manually (TASK-010).
- Visual regression and styling.

## Rules

- A test must fail against broken behavior. For the fallback tests, break the
  fallback once and confirm the test fails, then restore it.
- Tests pass dependencies in. They do not mock modules to reach the code under
  test.
- `npm test` at the repository root runs every package. It must pass from a
  fresh clone before any task is marked done.
- Typecheck and lint also pass before a task is marked done.

# Resilience stories

## RES-01: The app keeps working when the flag API is unavailable

**Priority:** P0 | **Scope:** MVP | **Owners:** ui

As an application developer, I want flags to resolve from env and code defaults when the flag API cannot be reached, so that a flag outage never breaks my app.

## Acceptance criteria

- [ ] With the API stopped, the UI renders and every declared flag resolves from its env fallback or its code default.
- [ ] A fetch that does not finish within the timeout is abandoned and treated as a failure.
- [ ] A network error, a non-2xx response, and a response that fails schema validation each fall back without throwing.
- [ ] The flag fetch never blocks the first render.
- [ ] When the API becomes reachable again, a later fetch replaces fallback values with API values.
- [ ] Precedence is API value, then env fallback, then code default.

## Notes

- Env values are inlined at build time. They are a startup fallback, not a live control.

## RES-02: Developers can see where a flag value came from

**Priority:** P1 | **Scope:** MVP | **Owners:** ui

As an application developer, I want each resolved value to report whether it came from the API, env or the code default, so that I can diagnose a flag that is not behaving as expected.

## Acceptance criteria

- [ ] The flag hook returns the value and its source: `api`, `env` or `default`.
- [ ] The flag management screen shows the source of each declared flag as resolved by this client.
- [ ] The screen marks flags declared in code but missing from the API, and flags in the API that no code declares.
- [ ] A visible banner states when the API could not be reached.

## RES-03: Last-known values survive an outage

**Priority:** P2 | **Scope:** Post-MVP | **Owners:** ui

As an application developer, I want the last values received from the API reused when it becomes unreachable, so that a restart during an outage does not revert flags to build-time values.

## Acceptance criteria

- [ ] Values from the last successful fetch are stored and used before env and defaults.
- [ ] Stored values carry a timestamp and expire after a configured age.
- [ ] The reported source distinguishes cached values from live API values.

## Notes

- Deliberately not built in the first iteration. Needs a storage and expiry policy.

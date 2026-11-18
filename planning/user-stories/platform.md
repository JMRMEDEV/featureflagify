# Platform stories

## ARC-01: API and UI share one validated contract

**Priority:** P0 | **Scope:** MVP | **Owners:** shared, api, ui

As a maintainer, I want the API and the UI to validate against the same schemas, so that a contract change fails in both places at once.

## Acceptance criteria

- [ ] Flag key, flag, request body, response and error schemas live in `shared` and nowhere else.
- [ ] `api` validates every request body with them, and `ui` validates every response with them.
- [ ] Changing a schema in `shared` produces a type error or a failing test in any package that depends on the old shape.
- [ ] The key format and the env-name mapping have tests for accepted and rejected examples.

## ARC-02: Storage and HTTP layers are replaceable

**Priority:** P1 | **Scope:** MVP | **Owners:** api

As a maintainer, I want the flag logic to depend on interfaces, so that I can swap the storage or the HTTP framework without rewriting it.

## Acceptance criteria

- [ ] The service imports no HTTP framework and no storage library.
- [ ] Storage is behind a `FlagRepository` interface with an in-memory implementation.
- [ ] One HTTP adapter exists and contains no flag rules.
- [ ] Service tests run against the in-memory repository without module mocking.
- [ ] The README names the files to add for another repository and for another adapter.

## ARC-03: A second HTTP adapter proves portability

**Priority:** P3 | **Scope:** Post-MVP | **Owners:** api

As a maintainer, I want an Express adapter next to the Fastify one, so that portability is shown and not only claimed.

## Acceptance criteria

- [ ] The same adapter test suite passes against both adapters.
- [ ] No change to the service is needed to add the second adapter.

## OBS-01: Operators can trace a request

**Priority:** P1 | **Scope:** MVP | **Owners:** api

As an operator, I want each request identified and logged in a structured way, so that I can follow a problem from a response back to its log lines.

## Acceptance criteria

- [ ] A request id is accepted from `x-request-id` or generated, and returned in the response header.
- [ ] Every log line for a request includes that id.
- [ ] Error bodies include the request id.
- [ ] Logs are JSON with an `event` field, for example `flag_created`, `flag_toggled`, `flag_invalid_record`.
- [ ] An invalid incoming request id is replaced and not logged verbatim.

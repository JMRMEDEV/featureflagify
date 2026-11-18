# TASK-002: Agent security and steering rules

## Metadata

| Field | Value |
|-------|-------|
| ID | TASK-002 |
| Priority | P0 |
| Scope | MVP |
| Type | infra |
| Domain | security |
| Subprojects | planning, api, ui, shared |
| Stories | SEC-01 |
| Depends on | TASK-001 |
| Blocks | TASK-003 |
| Status | ⬚ |
| Created | 2026-11-18 |

## Description

Define the Kiro agents and steering before any product code is written, so the
rules shape the implementation. One planner agent and one implementer agent per
package, each with tool settings that deny env files. Steering files cover
security, ownership, Git and testing, kept short.

## Acceptance Criteria

- [ ] Agent definitions exist for the planner and for `api`, `ui` and `shared`, each limited to its own package for writes.
- [ ] Every agent denies read and write on `.env`, `.env.*` and `.envrc`, with no exception for `.env.example`. Pattern behavior was tested on kiro-cli 2.20.1 and is recorded in `.kiro/steering/security.md`.
- [ ] The shell tool has deny rules that block any command naming a `.env*` file. Patterns are wrapped as `(?s).*<pattern>.*` because `deniedCommands` matches the whole command string.
- [ ] Steering files exist for security, ownership, Git (agents do not commit or push), and testing (links to `planning/docs/TESTING.md`).
- [ ] Agent prompts reference only files inside this repository.
- [ ] `agent-rules/README.md` lists the steering files and the agents.

## Verification

- [ ] With dummy env files containing no real values, in a scratch copy with steering and hooks removed, record that reading `.env`, writing `.env.local`, `cat .env` and `cat .env.example` are each blocked by the tool rules, and that `grep import.meta.env` still runs.
- [ ] Save the session excerpt for the AI audit trail (TASK-012).

## Deferred

- None.

## Comments

- **2026-11-18 16:15** — Created. Rule enforcement is checked by test, not by reading the config.

# Verification and Evidence — All Agents

Canonical policy. The test tiers are in `planning/docs/TESTING.md`. This file covers how
agents prove work is done.

## Evidence before completion

A task is not done until its Verification section is backed by evidence you produced in
this session. Confidence is not evidence.

1. Read the task's acceptance criteria and verification items first.
2. Run the check. Report what ran and the result, and what did not run and why. Say so
   when a statement comes only from reading code.
3. Never claim a command passed that you did not run.
4. Evidence goes in `docs/evidence/<TASK-ID>/` (command output, screenshots). Keep it
   small and curated.
5. The implementer reports. `ffy-qa` or the planner confirms. Then the planner updates
   the task status.

## Commands

Use the repository's own scripts. Check `package.json` before assuming a command exists.

| Command | Meaning |
|---------|---------|
| `npm run typecheck` | typecheck every package; `-w <pkg>` for one |
| `npm test` | tests in every package; `-w <pkg>` for one |
| `npm run lint` | lint |

Record `node --version` when reporting a failure that may depend on it.

## QA scope and proportion

- One QA pass per task. Run the package checks, review each acceptance criterion, confirm
  the evidence exists. Do not re-derive what a committed test already enforces.
- Always check the trust boundaries: precedence order, fallback on every failure kind,
  safe default for unknown or invalid flags, no write on a rejected request, one audit
  entry per real change, no secret in logs or fixtures.
- Mutation proof ("a test must fail without the fix") is required for a new kind of test
  or for high-risk logic. One failing case per kind.
- UI: assert roles, labels, state and announcements in component tests. Screenshots show
  layout only; they do not prove behavior.
- No E2E unless a behavior depends on a real flow. No second pass unless the first found
  a defect.
- Report what you skipped on purpose.

## Rules

- A test must fail against broken behavior. Assert values and state, not that something
  rendered.
- Tests are independent and deterministic, and inject time, ids and `fetch`.
- No hard-coded credentials in tests or fixtures.
- Stop any dev server you started before you finish.
- Typecheck, lint and tests all pass before a task is reported done
  (`typescript-validation.md`).

## Environment

Never use the `find` command. It is slow and unreliable on WSL-mounted drives. Use the
`glob`, `grep` or `ls` tools. Each agent denies `find` in `shell.deniedCommands`. The
rule is a regex over the command string and cannot see `find` inside `sh -c '...'`, so
the prose rule still binds.

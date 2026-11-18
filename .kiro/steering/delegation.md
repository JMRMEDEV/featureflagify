# Ownership and Delegation — All Agents

Canonical policy. Ownership is by path, within one repository.

## Rule

Each path has one owner. Do not modify files you do not own. If work needs another
owner's path, report to the planner, who delegates with full context. File changes
outside an agent's write scope also prompt the owner (`toolsSettings.write.allowedPaths`).

## Ownership by path

| Path | Owner | Notes |
|------|-------|-------|
| `ui/**` | `ffy-dev` | |
| `api/**` | `ffy-api` | |
| `shared/**` | `ffy-shared` | every shape change needs a matching `planning/docs/CONTRACTS.md` edit approved by the planner |
| Test files and `docs/evidence/**` | `ffy-qa` | owners also write the tests for their own code |
| `planning/**`, `docs/**` (except evidence), `.kiro/**`, root `README.md` and root config | `ffy-planner` | |
| `libs/**` | nobody | reference copy of HermOS, read only |
| Git (stage, commit, push) | `ffy-planner` only | see `git.md` |

## Delegation matrix

| You need... | Delegate to |
|-------------|-------------|
| UI, resolver, provider, management screen | `ffy-dev` |
| Flag service, repository, audit log, HTTP adapter | `ffy-api` |
| A schema, type or env-name helper | `ffy-shared` |
| Independent verification, extra tests, evidence | `ffy-qa` |
| Task content, architecture, priorities, bookkeeping, commits | `ffy-planner` |

## Rules

1. Never write outside your owned paths, not even a "small fix".
2. Never copy a pattern from another owner's path to avoid delegating.
3. A delegation prompt carries: task ID, goal, files, constraints, acceptance criteria,
   what to report. Agents run with the repository root as the working directory.
4. Wait for the subagent to finish before dependent work.
5. Report in a fixed shape: what was done, verification (commands and results, or "not
   run" and why), deferred. Subagents never edit task status.
6. **Two failed approaches means stop and report to the planner.** Do not loop and do
   not work around an ownership boundary.
7. Subagents do not inherit trust from their parent. Each agent definition carries its
   own `allowedTools` and `toolsSettings`.

## Violations (never acceptable)

- Editing another owner's path because you were already there.
- Re-declaring a shared shape in `api` or `ui` instead of changing `shared`.
- Running mutating git, a publish, or reading a secret.
- Marking a task done without the evidence required by `verification.md`.

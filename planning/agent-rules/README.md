# Agent and contributor rules

Agents live in `.kiro/agents/` at the repository root. Start every agent from the
repository root: the path patterns in `toolsSettings` are relative to the working directory.

## Agents

| Agent | Owns (writes) | Shortcut | Notes |
|-------|---------------|----------|-------|
| `ffy-planner` | `planning/**`, `docs/**`, `.kiro/**`, root `README.md` and root config | ctrl+p | Orchestrator. Only agent that commits, with owner approval |
| `ffy-dev` | `ui/**` | ctrl+w | Vite + React client |
| `ffy-api` | `api/**` | ctrl+a | Flag service and HTTP adapter |
| `ffy-shared` | `shared/**` | ctrl+y | Schemas and types for the contract |
| `ffy-qa` | test files, `docs/evidence/**` | ctrl+q | Verifies and reports. Never fixes product code |

Agent prompts are in `docs/agents/`. Format: kiro-cli 2.x (`toolsSettings`, `allowedTools`).

## Steering (`.kiro/steering/`)

| File | Rule |
|------|------|
| `security.md` | Hard block on every `.env*` file and credentials, how it is enforced and tested |
| `delegation.md` | Ownership by path and how to delegate |
| `git.md` | Only the planner commits and the approval flow |
| `conventional-commits.md` | Commit message format: one line, at most 50 characters, no body |
| `verification.md` | Evidence before completion, QA scope, proportion |
| `typescript-validation.md` | Typecheck after every `.ts`/`.tsx` change, no shortcuts |

## Skills (`.kiro/skills/`)

| Skill | Use |
|-------|-----|
| `typescript-validation` | The typecheck loop and rejected shortcuts, with a checklist |
| `conventional-commits` | Write and validate a one-line commit message of at most 50 characters |

## Policy and role contexts

Policies state invariants. Role contexts (the prompts) link only to material the role
needs to execute.

# Conventional Commits — All Agents

Canonical policy for commit messages. Only the planner commits (`git.md`). Other agents
follow this file when they propose a message in a report. The procedure is in the skill
`conventional-commits`.

## Format

```text
type(scope): subject
```

One line. Nothing else.

## Hard rules

- **Single line only.** No body, no blank line plus body, no footers, no trailers (no
  `Co-authored-by`, `Signed-off-by`, issue references).
- **The whole line is at most 50 characters**, counting the `type(scope): ` prefix.
- Type is lowercase and one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`, `revert`.
- Scope is optional, lowercase, in parentheses. Use one of the scopes below.
- Subject starts right after `: ` with a non-space character, in imperative mood
  ("add", not "added" or "adds"), lowercase by convention (the pattern does not enforce
  it), with no trailing period.
- Breaking change: put `!` after the type or scope (`feat(shared)!: rename key`). It still
  has to fit in 50 characters.
- Task ID goes in the subject when it fits (`TASK-004`), otherwise leave it out. Do not
  shorten words until they are unreadable to make it fit; reword instead.
- Never skip the commit hook with `--no-verify`.

## Scopes

| Scope | Use for |
|-------|---------|
| `shared` | `shared/` schemas, types, helpers |
| `api` | `api/` service, adapter, repository, audit log |
| `ui` | `ui/` registry, resolver, provider, screen |
| `planning` | `planning/` stories, tasks, indexes, docs |
| `docs` | `docs/` research, agent prompts, evidence |
| `kiro` | `.kiro/` agents, steering, skills |
| `repo` | root config, workspaces, tooling, README |

A commit touches one scope. If it spans several, it is probably two commits.

## Validation pattern

A message is valid when it matches this regular expression and is at most 50 characters:

```text
^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._/-]+\))?!?: [^ ].*[^.]$
```

## Examples

| Valid | Why |
|-------|-----|
| `feat(api): add flag service TASK-004` | type, scope, imperative, 36 characters |
| `fix(ui): fall back on invalid response` | 39 characters |
| `docs(planning): mark TASK-003 done` | 34 characters |
| `chore(kiro): add commit skill` | 29 characters |
| `feat(shared)!: rename flag key schema` | breaking, 37 characters |

| Invalid | Problem |
|---------|---------|
| `Added the flag service.` | no type, past tense, trailing period |
| `feat(api): add flag service and audit log with request ids` | 59 characters |
| `feat(api): add flag service` + a body paragraph | body not allowed |
| `fix(api): stuff` | not a meaningful subject |

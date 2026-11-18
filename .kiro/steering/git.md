# Git Rules — All Agents

Canonical policy. Nobody but the planner commits.

## Subagents run NO mutating git — ABSOLUTE

`ffy-dev`, `ffy-api`, `ffy-shared` and `ffy-qa` never run: `add`, `commit`, `push`, `pull`,
`fetch`, `stash`, `reset`, `checkout`, `restore`, `clean`, `switch`, `merge`, `rebase`,
`tag`, `rm`, `mv`, `apply`, `init`, `clone`, `remote`, `config`, `worktree`.

Why: agents share one working tree with uncommitted work from others. A `stash` or
`pull --rebase` silently shelves or discards it. Read-only git (`status`, `diff`, `log`,
`show`) is allowed when the planner asks. If you think you need git, stop and report.

Enforcement: each non-planner agent denies the mutating subcommands in
`toolsSettings.shell.deniedCommands`. The planner prompts for every commit; nothing
mutating is on its allow list.

## The planner's commit workflow

1. A subagent reports done and verified and leaves changes uncommitted.
2. The planner reviews the diff and confirms the evidence.
3. The planner stages specific files (never `git add .` or `-A`), shows the file list
   and the message to the owner, and waits for approval.
4. The planner commits.
5. Before staging, the planner checks that no env file, credential or session log with
   unredacted content is included.

## Commit messages

The format, scopes, validation pattern and examples are in `conventional-commits.md`, and
the procedure is the skill `conventional-commits`. In short: one line, Conventional Commits,
at most 50 characters including the prefix, no body, no trailers. Never use `--no-verify`.

## Push, branches, history

- Never push without an explicit owner request.
- Never force push, `reset --hard`, `clean -f` or skip hooks (`--no-verify`). These are
  denied for the planner too.
- Prefer new commits over `--amend`. Work happens on the current branch unless the owner
  asks for a branch.

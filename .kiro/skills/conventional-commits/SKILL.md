---
name: conventional-commits
description: Write and validate a Conventional Commits message with no body and at most 50 characters. Activate when the planner prepares a commit, or when any agent proposes a commit message in a report. Picks the type and scope from the staged diff, checks length and pattern, and rejects bodies, trailers and over-long subjects.
---

# Conventional Commits procedure

Policy: `.kiro/steering/conventional-commits.md`. Commit rights and the approval flow are in
`.kiro/steering/git.md`: only the planner commits, and only after the owner approves the file
list and the message.

## Inputs

The files being committed (or the diff the planner is reviewing) and the task ID.

## Steps

1. **Read the change.** Look at the diff of the files you will stage (`git diff -- <files>`,
   read-only). One commit, one scope. If the diff spans scopes, say so and propose a split.
2. **Pick the type** by what the change does to behavior:
   - `feat` new capability, `fix` bug fix, `refactor` no behavior change,
   - `test` tests only, `docs` documentation only, `build`/`ci` tooling,
   - `chore` anything else that does not ship (steering, agent files, indexes).
3. **Pick the scope** from the table in the steering file.
4. **Write the subject** in imperative mood, lowercase, no period. Name the outcome, not the
   file. Add the task ID (`TASK-004`) if it fits.
5. **Check it.** Run both checks on the exact string you will use:

   ```bash
   msg='feat(api): add flag service TASK-004'
   printf '%s' "$msg" | awk '{ print length($0) " characters" }'
   printf '%s\n' "$msg" | grep -Eq '^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9._/-]+\))?!?: [^ ].*[^.]$' && echo valid || echo INVALID
   ```

   The length must be 50 or less and the result must be `valid`. If it is longer, reword the
   subject. Do not drop the type or scope to save space.
6. **Show the owner** the file list and the message and wait for approval. Do not commit
   without it.
7. **Commit** with `git commit -m "<message>"`, one `-m` only, so no body is created. Never use
   `--no-verify`, never add trailers.

## Rejected

| Attempt | Do instead |
|---------|-----------|
| A second `-m` or a body paragraph | put the detail in the task file or the report |
| `Co-authored-by` or issue trailer | leave it out |
| More than 50 characters | reword; split the commit if it describes two things |
| `wip`, `update`, `fix stuff` | name the outcome |
| One commit for code and unrelated docs | split by scope |

## Report shape for non-planner agents

When you finish a task, include a proposed message as one line, already checked:

```text
Proposed commit: feat(ui): add flag resolver TASK-007   (38 characters, valid)
```

You do not run `git commit` yourself.

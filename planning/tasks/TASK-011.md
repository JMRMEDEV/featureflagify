# TASK-011: README and decision notes

## Metadata

| Field | Value |
|-------|-------|
| ID | TASK-011 |
| Priority | P1 |
| Scope | MVP |
| Type | chore |
| Domain | delivery |
| Subprojects | planning |
| Stories | — |
| Depends on | TASK-010 |
| Blocks | — |
| Status | 🔧 |
| Created | 2026-11-18 |

## Description

Write the root README for a reader who has never seen the project, using the
structure the challenge asks for plus the disclosure points agreed earlier.

## Acceptance Criteria

- [x] How to run: install, dev, test, typecheck, with the Node version.
- [x] Reused versus new: what came from existing personal codebases and the HermOS copy in `libs/hermOS`, and what was built for this project. States the clock start time and what counted toward it.
- [x] Role, why this is a good representation of the author's work, and what would be done differently today.
- [x] Assumptions and the decision register, linking to `planning/docs/ARCHITECTURE.md`.
- [x] Tradeoffs chosen on purpose, and the list of things not built with reasons.
- [x] Known limits: build-time env values, no delete or archive, no authentication, unauthenticated actor.
- [x] What would be improved with another day, in priority order.
- [ ] A short "How AI was used" section: what was delegated, what was corrected, how it was verified, with links to the curated sessions.
- [ ] No source-project names, internal task numbers, assignees or commit hashes from the source project appear in the repository.

## Verification

- [ ] A person who did not write it follows the README from a fresh clone and gets the app running.
- [ ] `grep -ri` for the source project's names finds nothing outside the research note's disclosure section.

## Deferred

- None.

## Comments

- **2026-11-18 16:15** — Created.
- **2026-11-18 18:10** — README drafted. Clock set by the owner: first TASK-001 commit to the TASK-010 done commit, about 1h09m. Open: links to curated sessions (TASK-012), the source-name check on `docs/research/codebase-patterns.md`, and the fresh-clone read-through (deferred with TASK-001's fresh-clone check). "Reused versus new" is written from the research note and the owner's description.

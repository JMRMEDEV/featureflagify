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
| Status | ⬚ |
| Created | 2026-11-18 |

## Description

Write the root README for a reader who has never seen the project, using the
structure the challenge asks for plus the disclosure points agreed earlier.

## Acceptance Criteria

- [ ] How to run: install, dev, test, typecheck, with the Node version.
- [ ] Reused versus new: what came from existing personal codebases and the HermOS copy in `libs/hermOS`, and what was built for this project. States the clock start time and what counted toward it.
- [ ] Role, why this is a good representation of the author's work, and what would be done differently today.
- [ ] Assumptions and the decision register, linking to `planning/docs/ARCHITECTURE.md`.
- [ ] Tradeoffs chosen on purpose, and the list of things not built with reasons.
- [ ] Known limits: build-time env values, no delete or archive, no authentication, unauthenticated actor.
- [ ] What would be improved with another day, in priority order.
- [ ] A short "How AI was used" section: what was delegated, what was corrected, how it was verified, with links to the curated sessions.
- [ ] No Hermes names, internal task numbers, assignees or commit hashes from the source project appear in the repository.

## Verification

- [ ] A person who did not write it follows the README from a fresh clone and gets the app running.
- [ ] `grep -ri` for the source project's names finds nothing outside the research note's disclosure section.

## Deferred

- None.

## Comments

- **2026-11-18 16:15** — Created.

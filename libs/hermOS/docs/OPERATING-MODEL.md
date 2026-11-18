# HermOS operating model

## Source of truth

`docs/` records decisions and constraints; `user-stories/` records product
outcomes and acceptance criteria; `tasks/` records executable work,
dependencies, ownership, status, and evidence. Delivery reports summarize
linked evidence and never replace it. Stable IDs are never renumbered.

`user-stories/INDEX.md` is the compact, machine-readable lookup. Domain files
hold the detailed actor/outcome statement and observable acceptance criteria.
Tasks link to one or more story IDs, except explicitly marked infrastructure or
operational work. A task may implement several stories and a story may require
several tasks.

## Delivery loop

1. Define a user story and acceptance criteria.
2. Derive a dependency-aware task.
3. Assign one accountable role/repository.
4. Implement within that ownership boundary.
5. Attach verification evidence before completion.
6. Update indexes and report linked outcomes, risks, decisions, and confidence.

Use the smallest role roster that covers the product. A planner coordinates,
specialists own their repository, QA validates behavior, and a librarian keeps
the ledger coherent.

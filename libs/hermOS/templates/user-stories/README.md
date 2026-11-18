# User stories

`user-stories/` is the canonical record of product outcomes. Write detailed
stories in domain files and list every active story in `INDEX.md`.

Stories describe the user or stakeholder need and observable acceptance
criteria. They are not implementation plans and do not contain task status.
Implementation work belongs in `tasks/`; each feature task links to one or more
stable story IDs.

## Conventions

- Assign stable, domain-prefixed IDs such as `AUTH-01` or `JRN-03`. Never
  renumber or reuse an ID.
- Group stories by domain in a descriptive file such as `authentication.md` or
  `journeys.md`.
- Use the format: “As a <actor>, I want <outcome>, so that <value>.”
- Give every implementable story observable acceptance criteria.
- Keep the human-readable detail in domain files and the compact lookup data in
  `INDEX.md` synchronized.

Use `TEMPLATE.md` when creating a story.

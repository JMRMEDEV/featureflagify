# {{PRODUCT_NAME}} — Planning

This repository is the versioned delivery control plane for {{PRODUCT_NAME}}.

1. Start with `docs/VISION.md` for enduring product intent and principles.
2. Use `docs/INDEX.md` to find decisions and constraints.
3. Use `user-stories/INDEX.md` to find product intent and acceptance criteria.
4. Use `tasks/INDEX.md` to select dependency-ready work.
5. Record verification evidence before completing a task.

Run `node .hermos/scripts/audit.js` to verify required artifacts exist and that
documentation is internally consistent (story index ↔ sections, task → story
references, and relative links). Add `--quiet` to print only on failure.

HermOS adoption state: `.hermos/manifest.json`.

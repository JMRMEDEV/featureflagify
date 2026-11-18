# Upgrading a HermOS adoption

1. Read the target release notes and applicable migration instructions.
2. Compare release templates to the project artifacts; never overwrite
   project-specific stories, tasks, decisions, or role rules.
3. Apply changes on a branch and run `node .hermos/scripts/audit.js` plus normal
   project verification.
4. Update `.hermos/manifest.json` with the new version, date, and migration note.
5. Commit the migrated artifacts and manifest together.

Patch releases need no migration; minor releases may add optional artifacts;
major releases document required schema, policy, or tooling migrations.

## 0.4.0: Add the documentation-consistency validator

This release adds `.hermos/scripts/check-docs.js`, a pure read-only validator,
and wires `.hermos/scripts/audit.js` to run it after the required-files check.
For an existing 0.3.x adoption:

1. Copy `check-docs.js` from this release into `.hermos/scripts/check-docs.js`
   (it is scaffolded there for new adoptions). It is generalized: it discovers
   story IDs by scanning `user-stories/*.md` for `## <PREFIX>-<N>:` sections, so
   it works with your own ID prefixes and domains without edits.
2. Update your generated `.hermos/scripts/audit.js` to match the 0.4.0 template:
   add `.hermos/scripts/check-docs.js` to the required-files list, and after
   printing "HermOS audit passed." spawn `check-docs.js` (forwarding argv flags)
   and exit with its status.
3. Run `node .hermos/scripts/audit.js`. The presence check must still print
   "HermOS audit passed."; the validator then reports any INDEX↔section drift,
   stat-table drift (only if you track `✅`/`🔧`/`⬚` status glyphs in your
   INDEX), unknown task→story references, or broken relative markdown links.
   Use `--quiet` to print only on failure.
4. Resolve any reported inconsistencies, then update `.hermos/manifest.json`
   with the new version, date, and migration note.

The validator never writes. If your adoption also has a task-stats generator,
that generator still owns the generated task-count blocks; `check-docs.js`
validates only the things the generator does not.

## 0.3.0: Add the product vision

This release makes `docs/VISION.md` a required planning artifact. For an existing 0.2.x adoption:

1. Create `docs/VISION.md` from the 0.3.0 template, or adapt an existing product-vision document into it.
2. Describe the enduring product purpose, core experience, trust boundaries, product principles, and a human definition of success. Keep implementation plans in stories/tasks rather than this document.
3. Add `docs/VISION.md` to `docs/INDEX.md` and make it the first destination from the planning-repository README.
4. Run the adoption audit before updating the manifest version and migration note.

## 0.2.0: Add the canonical user-story layer

This release adds `user-stories/` as the canonical product-intent layer. For an
existing 0.1.x adoption:

1. Create `user-stories/README.md`, `user-stories/INDEX.md`, and
   `user-stories/TEMPLATE.md` from the 0.2.0 templates.
2. Move or copy detailed product stories from any existing `stories/` directory
   into domain files under `user-stories/`. Keep IDs stable.
3. Populate `user-stories/INDEX.md` with every active story and its file/section
   reference. Each feature task's `Stories` metadata must keep using those IDs.
4. Update local contributor guidance and links from `stories/` to
   `user-stories/`, then run the adoption audit.

Do not overwrite project-specific story content. The old `stories/` directory
is not deleted automatically; remove it only after every project reference has
been migrated.

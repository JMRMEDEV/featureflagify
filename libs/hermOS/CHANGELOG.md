# Changelog

HermOS follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.4.0] - 2026-10-21

### Added

- Generalized read-only documentation-consistency validator
  (`.hermos/scripts/check-docs.js`) scaffolded into every adoption. It discovers
  story IDs by scanning `user-stories/*.md` for `## <PREFIX>-<N>:` sections
  (no hardcoded prefixes, domains, or subprojects) and runs four checks:
  INDEX lookup rows ↔ domain sections (missing/orphan), hand-maintained story
  completion stat tables ↔ live INDEX glyphs (skipped when an adoption tracks no
  status glyphs; tolerant of 2- or 3-count tables), task `Stories` references
  resolve, and relative markdown links resolve. Pure read-only, exits 1 on
  drift, supports `--quiet`.

### Changed

- The generated `.hermos/scripts/audit.js` now requires `check-docs.js` to be
  present and, after the required-files presence check passes ("HermOS audit
  passed."), chains into `check-docs.js` so `node .hermos/scripts/audit.js`
  reports both presence and content-consistency problems. Flags (e.g.
  `--quiet`) pass through.


## [0.3.0] - 2026-09-07

### Added

- Required `docs/VISION.md` scaffold document for enduring product intent, experience, trust boundaries, principles, and a definition of success.
- Adoption audit check and upgrade guidance for the vision document.

### Added

- Upgrade manifest and adoption audit guidance.

## [0.2.0] - 2026-09-06

### Added

- Canonical `user-stories/` scaffold with a detailed-story template and a
  machine-readable index.
- Adoption audit checks for the user-story layer.

### Changed

- Planning and task guidance now distinguishes durable user stories from
  executable implementation tasks.

## [0.1.0] - 2026-09-06

### Added

- Initial versioned planning-control-plane scaffold: stories, tasks, documents,
  delivery reports, agent policies, workspace, manifest, and audit tooling.

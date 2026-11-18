# HermOS

> A versioned operating system for product delivery.

HermOS gives a product a durable planning control plane: linked user stories,
decisions, executable work, ownership, evidence, and delivery reporting.

## Use it

```bash
node bin/hermos.js init ../my-product-planning --name "My Product" --repos web,api
cd ../my-product-planning
node .hermos/scripts/audit.js
```

Each adoption stores `.hermos/manifest.json` with the installed HermOS version.
Review [CHANGELOG.md](CHANGELOG.md) and [docs/UPGRADES.md](docs/UPGRADES.md) for
new releases; apply migrations deliberately and update the manifest only after
verification. HermOS is committed into each planning repository, not a runtime
dependency.

## Release policy

HermOS uses SemVer. Patch releases correct artifacts; minor releases add
compatible operating-model improvements; major releases require a documented
migration. Before each release, update `VERSION` and `CHANGELOG.md`, then run
`npm test` and `npm run release:check`.

## Contents

- `templates/` — planning-repository artifacts
- `templates/user-stories/` — canonical user-story detail, index, and template
- `bin/` — scaffold CLI
- `docs/` — operating, upgrade, and release policy
- `VERSION` and `CHANGELOG.md` — the living OS contract

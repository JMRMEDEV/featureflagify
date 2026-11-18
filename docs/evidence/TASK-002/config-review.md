# TASK-002 config review (ffy-qa, read-only)

Node v20.19.4. No env file was read, written or created. No git run. Enforcement on the
real tools (verification item 1) was NOT run: it needs owner approval.

## Commands run

- `cat -n .kiro/agents/*.json docs/agents/*.md planning/agent-rules/README.md`
- `ls` of `.kiro`, `docs/agents`, `planning`, `planning/docs`, the INDEX files
- `node /tmp/qa002.js`: loads each agent's `deniedCommands`, checks the `(?s).*` wrapper,
  compiles each as a full-match regex, runs plain command strings (no env file names
  except `grep -rn import.meta.env .`) and the allowedCommands against a newline string.

## Per criterion

| # | Result | Evidence |
|---|--------|----------|
| 1 Agents and write scope | PASS | api `ffy-api.json:75-77` `./api/**`; dev `:75-77` `./ui/**`; shared `:75-77` `./shared/**`; qa `:75-80` tests + `docs/evidence`; planner `:76-85` planning, docs, .kiro, README, package.json, tsconfig.base, .gitignore, .nvmrc. Matches `delegation.md:12-20`. Notes D4, D8. |
| 2 deniedPaths | PASS (config) | All 5 agents deny `./**/.env`, `./**/.env.*`, `./**/.envrc` and credential/key patterns for read and write, with no `.env.example` exception (e.g. `ffy-api.json:53-63`, `79-89`). Real tool behavior not re-run (see skipped). `*.env` listed in `security.md:11` is not in any deniedPaths (D3). |
| 3 deniedCommands | PASS with gaps | All 5 agents: every pattern starts `(?s).*`, all compile, none matches `grep -rn import.meta.env .`. find, `.env` boundary, printenv, publish denied. Non-planner agents deny every git subcommand in `git.md:9-12`. Planner denies `--no-verify`, force push, `reset --hard`, `clean -f`. Gaps D1, D2, D5. |
| 4 Steering | PASS | security, delegation (ownership), git, verification exist. Testing rule is in `verification.md:3` which points to `planning/docs/TESTING.md` (exists, 31 lines). It is a backtick reference, not a markdown link. No file named `testing.md`; README maps it to `verification.md`. |
| 5 Prompts in repo | PASS | `grep -rnE "/home/|~/|https?://|\.\./" docs/agents` returned nothing. Prompts name only repo paths. See D6 for the agent JSON resource paths. |
| 6 agent-rules README | PASS | `planning/agent-rules/README.md:8-14` lists 5 agents, `:20-27` lists 6 steering files, `:31-34` lists 2 skills. Exactly matches `.kiro/`. |

## Defects (none fixed)

- D1 (medium) allowedCommands `^npm (run )?(test|typecheck|lint)...( [^;&|`$()]*)?$` accepts a
  newline and `>`. `node -e` check: `npm test -w api\nrm -rf x` and `npm test > out.txt` both match
  in all 5 agents (`ffy-api.json:97` etc.). An allowed command can carry a second line that
  the deny list does not cover. Fix: exclude `\n\r<>` in the class.
- D2 (medium) git deny regexes (`ffy-api.json:107`, same in dev, shared, qa) start at `^` or
  `[;&|(]\s*`. Not denied: ` git commit` (leading space), `a\ngit commit`,
  `git -c a=b commit`, `git --no-pager commit`, `/usr/bin/git commit`, `sudo git commit`.
  The owner prompt is the backstop; these are not on any allow list.
- D3 (low) `security.md:11` forbids `*.env` but no agent has `./**/*.env` in deniedPaths, and the
  shell `.env` pattern needs a boundary before the dot (`foo.env` is not matched).
- D4 (low) Planner write allow `./docs/**` (`ffy-planner.json:78`) includes `docs/evidence`,
  which `delegation.md:19` says is not the planner's. Planner also cannot write root files
  not listed (`package-lock.json`, any lint or vitest config), while "root config" is its.
- D5 (medium, not tested) Shell `autoAllowReadonly: true` (every agent) auto-runs read-only
  commands without a prompt. The shell rules only look at command text, so `cat ~/.ssh/...`,
  `cat x.pem` or `grep -r KEY .` (which descends into env files) are not denied and may not
  prompt. `security.md:38` says "anything not on an allow list prompts". Also `grep`, `glob`
  and `code` are in `allowedTools` with no `toolsSettings.grep/glob` path deny, so their
  handling of deniedPaths is unverified. Needs an owner-approved probe.
- D6 (medium, not tested) `resources` mixes `file://.kiro/steering/**/*.md` (cwd-based) with
  `file://../../docs/agents/api.md` and `file://../../planning/...` (agent-file-based). If
  resources resolve from the working directory, `../../` points outside the repo
  (`/home/jmrmedev/docs/...` does not exist), which breaks criterion 5 and loads no context.
  Prompt `file://../../docs/agents/*.md` resolves correctly from `.kiro/agents/`. Check in
  kiro-cli.
- D7 (low) Planner `web_fetch.trusted` entries are unanchored (`.*kiro\.dev.*`), so
  `https://evil.example/?kiro.dev` is trusted. `security.md:73-76` limits network to docs
  sites and localhost.
- D8 (info) `read.deniedPaths` also blocks `./**/node_modules/**` (not documented in
  `security.md`'s table). `security.md:49` says the final write-rule run is pending, so
  verification item 1 and the audit excerpt remain open.

## Skipped on purpose

- Verification item 1 (dummy env files, real read/write/cat probes): owner approval needed.
- Session excerpt for the audit trail (TASK-012): depends on item 1.
- Tests for typecheck/lint/tests: no TypeScript changed by this task.

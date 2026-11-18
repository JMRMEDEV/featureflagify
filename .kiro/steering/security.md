# Security Rules — All Agents

Canonical policy. Real `.env` files may hold secrets in a real product, so agents
treat them as off limits. This project only holds placeholders, and the rule is
kept to show how it would be enforced.

## Env files and credentials — ABSOLUTE

NEVER:

- read or write `.env`, `.env.*`, `.envrc`, `*.env`, or credential and key files
  (`*credentials*.json`, `*service-account*.json`, `*.pem`, `*.key`, `*.p12`, `*.p8`,
  `*.keystore`, `*.jks`), by any method: the file tools, `cat`, `grep`, `sed`, `cp`,
  `source`, `node -e`, a script you wrote, or anything else;
- scan for them (`ls`, `glob`, `grep -r` aimed at secrets);
- access `~/.ssh`, `~/.aws`, `~/.config/{gcloud,firebase,configstore,gh}`, `~/.npmrc`;
- echo, print or log a secret value; refer to a variable by name instead
  (`process.env.NAME`, `import.meta.env.VITE_NAME`);
- write a real secret into code, tests, fixtures, docs, screenshots or evidence;
- send project code or secrets to a third-party endpoint unless the owner asked.

There is **no exception**, and that includes `.env.example`. The owner creates and edits
`.env.example` by hand. If you need to know a variable name, read it from
`planning/docs/CONTRACTS.md` (consumer env variables).

Instead: assume the owner configured credentials, and if something is missing say
"I need X configured". Do not go looking.

## How it is enforced

Steering is advice. The controls are in each agent's `toolsSettings`:

| Layer | Control |
|-------|---------|
| File read | `read.deniedPaths`: `./**/.env`, `./**/.env.*`, `./**/.envrc` and credential file patterns |
| File write | `write.deniedPaths`: the same patterns, plus `.git/**`, `node_modules/**` and `libs/**` |
| Shell | `shell.deniedCommands` regexes block any command that names a `.env*` file, plus `printenv`, `env`, and `echo` of secret-looking names |
| Human | Anything not on an allow list prompts the owner |

Verified on kiro-cli 2.20.1 with fake env files and the steering removed, so only the tool
rules were acting:

- Read tool, glob `./**/.env.*`: `.env.local`, `.env.production`, `.env.e2e` and
  `.env.example` were denied. `./**/.env` denied `.env`. The final agent denied `.env.example`.
- Shell, final agent: `cat .env`, `cat .env.example` and `echo hi; cat api/.env.local` were
  denied. `grep -rn import.meta.env .` ran.
- Write tool: `.env.local`, `.env.production.local`, `.env.staging` and `.git/**` were denied
  under an earlier character-class version of these patterns. The final `./**/.env.*` write
  rule uses the same matcher but was **not re-run**. TASK-002 covers that run.

How the shell patterns work: `deniedCommands` is matched against the **whole** command
string, not a substring. A pattern like `cat \.env` blocks only the exact command
`cat .env`. Every pattern is therefore written as `(?s).*<pattern>.*`. Keep that wrapper
when you add a rule. The `.env` pattern requires a token boundary before the dot, so
`import.meta.env` and `process.env` in code are not matched.

Limits you must not rely on: the shell rules match the command text. They cannot see
inside `sh -c '...'`, a script file, variable indirection or an alias. The prose rule
above still binds. Start agents from the repository root, because the path patterns are
relative to the working directory. A trusted tool (`--trust-tools`) still enforces
`deniedPaths` and `deniedCommands` but ignores `allowedPaths`.

## Deploy and publish

No agent publishes packages or deploys. `npm publish`, `npm login` and similar are
denied. The planner may do none of this without explicit owner approval each time.

## Dangerous operations — owner permission required

`git push`, force push, `reset --hard`, `clean -f`, deleting data, `rm -rf`, installing a
dependency with an unusual or typo-like name. Pin dependency versions.

## Network

Outbound requests only when the task needs them: the project's documentation sites and
`localhost` for manual checks. The API server binds to localhost in development.

## Reporting a vulnerability

Document it with reproduction steps, do not exploit it further, report it to the
planner for a task. A security test is a finding, not a fix.

# Security stories

## SEC-01: Agents cannot read or write real env files

**Priority:** P0 | **Scope:** MVP | **Owners:** planning, api, ui, shared

As the project owner, I want AI agents hard-blocked from reading or writing any `.env*` file, so that secrets are never exposed to a model or changed by one.

## Acceptance criteria

- [ ] Every agent definition denies read and write on `.env`, `.env.*` and `.envrc`, with no exception for `.env.example`.
- [ ] The shell tool cannot be used to read or copy env files: deny rules match the whole command string, and legitimate code searches such as `grep import.meta.env` still work.
- [ ] Steering states the rule and the safe alternative: ask the owner, and reference variables by name.
- [ ] A recorded test, run with steering removed so only the tool rules act, shows an agent attempting to read a dummy `.env`, write a dummy `.env.local`, and `cat` both, with each attempt blocked.
- [ ] The repository ignores `.env*` except `.env.example`, which the owner maintains by hand.

## Notes

- Steering text is advice. Tool settings are the control. The test must exercise the settings.
- Field names and pattern matching in agent settings must be checked against the Kiro documentation before they are relied on.

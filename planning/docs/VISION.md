# Featureflagify product vision

## Why this product exists

Teams ship code before they are ready to release it. A feature flag separates
the two, but only if switching a flag is quick, safe and traceable, and only if
an application keeps working when the flag service does not.

Featureflagify is a small, reusable flag manager. It is the first iteration of
something a team would keep building: a flag API, a typed contract shared with
its consumers, and a UI client that degrades gracefully. It is also a worked
example of building such a system with AI agents under explicit rules.

## The experience

An operator opens the flag list, creates a flag, and turns it on or off. An
application developer asks for a flag by key and always gets an answer, even
when the API is unreachable.

```text
Operator opens the flag list
  -> creates "new-checkout" and enables it
  -> every consumer sees the new value on its next fetch

Application starts while the flag API is down
  -> the app resolves each flag from build-time env, then from its code default
  -> the UI shows which source each value came from
```

## What makes it trustworthy

- A flag the system does not know about is off. A misspelled key never turns a
  feature on.
- Every change records who, what, when, the previous value and the new value.
- The flag API is the source of truth when it is reachable, and it is never a
  single point of failure for a consumer.
- Build-time env values are a fallback, not a live control. The product states
  this limit and does not imply otherwise.
- The product does not claim targeting, percentage rollouts, or per-user
  evaluation. Those are out of scope for this iteration.

## Product principles

- **Off by default.** Missing, unknown or invalid flag values resolve to off.
- **Explicit over implicit.** Every resolved value reports its source: `api`,
  `env` or `default`.
- **Small, replaceable parts.** Storage and the HTTP framework sit behind
  interfaces, so a team can swap them without touching flag logic.
- **One contract.** API and UI validate against the same schemas.
- **Agents work within rules.** AI agents may not read or write real env files,
  and every change they make is reviewed by a person.

## What success looks like

A reviewer clones the repository, runs one install and one test command, and
sees them pass. They create and toggle a flag in the UI, stop the API, reload
the UI, and watch values keep resolving from env and defaults with the source
shown. They then open the planning folder and trace each behavior back to a
story, a task, and the evidence that it works.

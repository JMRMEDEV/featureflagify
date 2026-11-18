# Flag management stories

## FLG-01: Operators manage flags

**Priority:** P0 | **Scope:** MVP | **Owners:** api, ui, shared

As an operator, I want to list flags, create a flag, and enable or disable it, so that I can control a feature's release without deploying code.

## Acceptance criteria

- [ ] The flag list shows key, name, description, enabled state and last update time.
- [ ] Creating a flag with a valid key adds it to the list, off unless `enabled` is set.
- [ ] Creating a flag with a key that already exists is rejected and the existing flag is unchanged.
- [ ] A key that does not match the key format is rejected with the failing field named.
- [ ] Enabling or disabling a flag changes its state and `updatedAt`, and the list reflects it.
- [ ] Toggling a flag that does not exist returns a not-found error.
- [ ] The toggle is a labelled switch that works with the keyboard and announces its new state to assistive technology.
- [ ] A failed toggle returns the switch to its previous state and shows an error message.

## Notes

- Flags cannot be deleted or archived in this iteration. Disabling is the off-switch (decision D8, story FLG-04).

## FLG-02: Operators can see who changed a flag

**Priority:** P1 | **Scope:** MVP | **Owners:** api, shared

As an operator, I want every flag change recorded, so that I can find out what changed, when, and who did it when something goes wrong.

## Acceptance criteria

- [ ] Creating a flag and changing its enabled state each write one audit entry with flag key, action, previous value, new value, actor, request id and time.
- [ ] A toggle to the value the flag already has writes no entry.
- [ ] Entries are returned newest first and can be filtered by flag key.
- [ ] The actor is taken from the optional `x-actor` header and is `anonymous` when absent.
- [ ] A rejected request writes no entry.

## Notes

- The actor is not authenticated. The audit log is a diagnostic aid, not a security control.

## FLG-03: Applications evaluate flags with safe defaults

**Priority:** P0 | **Scope:** MVP | **Owners:** api, ui, shared

As an application developer, I want to read every flag value in one call and have unknown flags resolve to off, so that a typo or a missing flag never enables a feature.

## Acceptance criteria

- [ ] One endpoint returns the value of every flag as a key-to-boolean map.
- [ ] The evaluation endpoint never returns not-found. A key not in the map is unknown.
- [ ] The consumer resolves an unknown key from env, then from its code default, which is off unless declared otherwise.
- [ ] A stored record that fails validation is left out of the map and logged, and the other flags are unaffected.
- [ ] Management and evaluation use separate endpoints.

## FLG-04: Operators can retire flags

**Priority:** P3 | **Scope:** Post-MVP | **Owners:** api, ui

As an operator, I want to archive and then delete flags that are no longer used, so that the list stays small and typos can be cleaned up.

## Acceptance criteria

- [ ] An archived flag is hidden from the default list and still resolves to its code default in consumers.
- [ ] Deleting requires a confirmation and writes an audit entry.
- [ ] Archived flags can be restored.

## Notes

- Deliberately not built in the first iteration. See the decision register in `docs/ARCHITECTURE.md`.

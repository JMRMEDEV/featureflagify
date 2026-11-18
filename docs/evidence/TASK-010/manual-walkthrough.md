# TASK-010 manual walkthrough (browser)

**These steps were NOT run by an agent.** No browser was available. The owner runs them and
records the result (screen recording or screenshots) next to this file. The resolver and
real HTTP behavior behind each step are proven in `demo.md`. What is unproven until you run
this: how the screen renders the banner, the Retry button, the switch and the Source column.

Declared demo flags (`ui/src/app-flags.ts`): `new-checkout` (default Off), `dark-banner`
(default On), `beta-search` (default Off). Env name pattern: `VITE_FF_NEW_CHECKOUT`,
`VITE_FF_DARK_BANNER`, `VITE_FF_BETA_SEARCH`.

Use `beta-search` for the env fallback. Run every command from the repository root, in
separate terminals. The UI dev server defaults to `http://localhost:5173`, and the API must
allow exactly that origin.

## 0. Start both servers

Terminal A (API):

```text
FLAGS_API_PORT=3001 FLAGS_CORS_ORIGIN=http://localhost:5173 npm run dev -w api
```

Terminal B (UI):

```text
VITE_FLAGS_API_URL=http://127.0.0.1:3001 VITE_FF_BETA_SEARCH=true npm run dev -w ui
```

If Vite picks another port (it prints the URL), restart the API with `FLAGS_CORS_ORIGIN`
set to that exact origin. Note: `npm run dev -w api` uses `tsx watch`, so it restarts on
file changes. Do not edit files during the walkthrough.

Open the URL Vite prints (normally `http://localhost:5173`).

## 1. API running: toggle changes the value, source `api`

1. Expected on load: no banner. The Flags list says "No flags yet. Create the first one with
   the form above." The "Flags this app declares" table shows `new-checkout` Off `default`,
   `dark-banner` On `default`, `beta-search` On `env`. "In the API" shows "Missing from API"
   for all three.
2. Create the flag `new-checkout` with the form. Expected: announcement "Flag new-checkout
   created." The declared table row for `new-checkout` shows Off, source `api`, In the API
   "Yes".
3. In the Flags table, click the `new-checkout` switch (Off to On). Expected: announcement
   "Flag new-checkout is now enabled." The declared row shows On, source `api`.
4. Reload the browser page. Expected: `new-checkout` still On, source `api`. `beta-search`
   still On, source `env` (the API does not hold it).
5. Create `dark-banner` and toggle it to Off. Expected: declared row Off, source `api`
   (differs from its default On).

## 2. API stopped: banner, `env` and `default`

1. In terminal A press Ctrl+C. Confirm with `ss -ltn | grep 3001` that nothing listens.
2. Reload the browser page. Expected: the page still loads. A banner (role alert) reads
   "The flag API is unavailable. Values come from the env fallback and code defaults.
   Creating and toggling flags is disabled until the flag API is available." with a Retry
   button. The create form and all switches are disabled.
3. Declared table, expected: `new-checkout` Off `default`, `dark-banner` On `default`,
   `beta-search` On `env`. No `api` source anywhere.
4. Click Retry while the API is still down. Expected: the banner stays.

## 3. API restarted: Retry returns to `api`

1. In terminal A restart the same command as in step 0. Data is in memory, so it is empty.
2. Click Retry in the banner (no page reload). Expected: banner disappears, controls are
   enabled. The Flags list is empty again ("No flags yet..."). The declared table shows
   `default` for `new-checkout` and `dark-banner`, `env` for `beta-search`, and "Missing from
   API" for all three. The API is back but holds nothing, so `api` does not appear yet.
3. Create `new-checkout` and toggle it On. Expected: declared row On, source `api`.

## 4. Stop everything

Ctrl+C in both terminals. Confirm `ss -ltn | grep -E '3001|5173'` prints nothing.

## Result record (owner fills in)

| Step | Pass or fail | Evidence file |
|------|--------------|---------------|
| 1.1 to 1.5 | | |
| 2.1 to 2.4 | | |
| 3.1 to 3.3 | | |

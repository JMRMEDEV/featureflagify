// Evidence script for TASK-010. Not a product test: it is not named *.test.ts and lives
// outside every package include glob, so `npm test` never runs it.
// Usage (repo root): node_modules/.bin/tsx docs/evidence/TASK-010/demo.mts <baseUrl> <step>
//   step "seed"    create and toggle flags through the real management endpoints
//   step "resolve" fetch /evaluate with the real fetch and run the production resolveFlags
import { evaluateResponseSchema } from '@featureflagify/shared';
import { resolveFlags, type FlagEnv } from '../../../ui/src/flags/index.ts';
import { registry } from '../../../ui/src/app-flags.ts';

const [baseUrl, step] = process.argv.slice(2);
if (baseUrl === undefined || (step !== 'seed' && step !== 'resolve')) {
  throw new Error('usage: demo.mts <baseUrl> <seed|resolve>');
}

async function send(method: string, path: string, body: unknown): Promise<void> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-actor': 'demo-script' },
    body: JSON.stringify(body),
  });
  console.log(`${method} ${path} ${JSON.stringify(body)} -> ${response.status}`);
}

// Same steps as the provider's loadFlags: real fetch, schema parse, undefined on any failure.
async function fetchApiMap(): Promise<Record<string, boolean> | undefined> {
  try {
    const response = await fetch(`${baseUrl}/evaluate`, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) return undefined;
    const body: unknown = await response.json();
    return evaluateResponseSchema.parse(body).data.flags;
  } catch (error) {
    console.log(`fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function show(label: string, api: Record<string, boolean> | undefined, env: FlagEnv): void {
  console.log(`\n${label}`);
  console.log(`  api map: ${api === undefined ? 'unavailable' : JSON.stringify(api)}`);
  console.log(`  env:     ${JSON.stringify(env)}`);
  for (const [key, resolved] of Object.entries(resolveFlags(registry, api, env))) {
    console.log(`  ${key.padEnd(13)} ${JSON.stringify(resolved)}`);
  }
}

if (step === 'seed') {
  // new-checkout default false -> API true. dark-banner default true -> API false.
  // beta-search is never created, so the API does not hold it.
  await send('POST', '/flags', { key: 'new-checkout' });
  await send('PATCH', '/flags/new-checkout', { enabled: true });
  await send('POST', '/flags', { key: 'dark-banner', enabled: true });
  await send('PATCH', '/flags/dark-banner', { enabled: false });
} else {
  const api = await fetchApiMap();
  show('no env values', api, {});
  show('env VITE_FF_BETA_SEARCH=true', api, { VITE_FF_BETA_SEARCH: 'true' });
  show('env VITE_FF_NEW_CHECKOUT=false (API present: API must win)', api, {
    VITE_FF_NEW_CHECKOUT: 'false',
  });
}

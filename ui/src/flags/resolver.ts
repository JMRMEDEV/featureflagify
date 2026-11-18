import { hasAllKeys, type FlagRegistry } from './registry';

export type FlagSource = 'api' | 'env' | 'default';

export type ResolvedFlag = {
  readonly value: boolean;
  readonly source: FlagSource;
};

/** Injected env: a plain object, never `import.meta.env` read inside the resolver. */
export type FlagEnv = Readonly<Record<string, string | undefined>>;

/** Accepts `true`, `1`, `false`, `0` exactly. Anything else is ignored. */
export function parseEnvFlag(raw: string | undefined): boolean | undefined {
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  return undefined;
}

function ownValue<V>(record: Readonly<Record<string, V>>, key: string): V | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

/**
 * Resolves every declared flag. Order (D1): API value, env fallback, code default.
 * A key absent from the API map, or an API map of `undefined`, falls through.
 * Pure: no React, no fetch, no reads outside the arguments.
 */
export function resolveFlags<K extends string>(
  registry: FlagRegistry<K>,
  api: Readonly<Record<string, boolean>> | undefined,
  env: FlagEnv,
): Readonly<Record<K, ResolvedFlag>> {
  const entries = registry.keys.map((key): [K, ResolvedFlag] => {
    const fromApi = api === undefined ? undefined : ownValue(api, key);
    if (typeof fromApi === 'boolean') return [key, { value: fromApi, source: 'api' }];

    const fromEnv = parseEnvFlag(ownValue(env, registry.envNames[key]));
    if (fromEnv !== undefined) return [key, { value: fromEnv, source: 'env' }];

    return [key, { value: registry.defaults[key], source: 'default' }];
  });
  const resolved: Readonly<Record<string, ResolvedFlag>> = Object.fromEntries(entries);
  if (!hasAllKeys(resolved, registry.keys)) {
    throw new Error('Resolver did not produce a value for every declared flag');
  }
  return resolved;
}

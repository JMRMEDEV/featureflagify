import { flagEnvName } from '@featureflagify/shared';

/** The flags one app uses, with code defaults and the env name of each. */
export type FlagRegistry<K extends string> = {
  readonly keys: readonly K[];
  readonly defaults: Readonly<Record<K, boolean>>;
  readonly envNames: Readonly<Record<K, string>>;
};

/**
 * Declares the flags this app uses and their code defaults (D2).
 * The key union is inferred from the object, so a hook typed with `K` rejects
 * an undeclared key at compile time. Invalid keys throw at declaration, because
 * `flagEnvName` parses each key with the shared key schema.
 */
export function defineFlags<K extends string>(defaults: Record<K, boolean>): FlagRegistry<K> {
  const keys = Object.keys(defaults).filter((key): key is K => Object.hasOwn(defaults, key));
  const envNames = Object.fromEntries(keys.map((key) => [key, flagEnvName(key)]));
  if (!hasAllKeys(envNames, keys)) {
    throw new Error('Env names were not built for every declared flag');
  }
  return { keys, defaults, envNames };
}

/** Checked narrowing: true only when every key has an entry. */
export function hasAllKeys<K extends string, V>(
  record: Readonly<Record<string, V>>,
  keys: readonly K[],
): record is Readonly<Record<K, V>> {
  return keys.every((key) => Object.hasOwn(record, key));
}

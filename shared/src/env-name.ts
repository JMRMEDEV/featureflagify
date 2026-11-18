import { flagKeySchema } from "./flag-key";

/**
 * Maps a flag key to its consumer env variable name.
 * Keys never contain an underscore, so replacing "-" with "_" and upper-casing
 * is one-to-one: every valid key gives a distinct name, and the key can be
 * recovered by the reverse mapping.
 * Throws a ZodError when the key is not a valid flag key.
 */
export function flagEnvName(key: string): string {
  const valid = flagKeySchema.parse(key);
  return `VITE_FF_${valid.replaceAll("-", "_").toUpperCase()}`;
}

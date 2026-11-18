import type { Flag } from "@featureflagify/shared";

/**
 * Storage port for flags. Reads return `unknown` on purpose: stored data is not
 * trusted, so the service validates each record with the shared flag schema.
 * Another storage backend only has to implement this interface.
 */
export interface FlagRepository {
  /** Every stored record, in insertion order. */
  findAll(): Promise<readonly unknown[]>;
  /** The stored record for a key, or undefined when none exists. */
  findByKey(key: string): Promise<unknown>;
  /** Store a new flag. The service has already checked the key is free. */
  insert(flag: Flag): Promise<void>;
  /** Replace the stored flag with the same key. */
  update(flag: Flag): Promise<void>;
}

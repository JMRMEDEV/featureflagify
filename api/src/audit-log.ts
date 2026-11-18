import type { AuditEntry } from "@featureflagify/shared";

/**
 * Storage port for audit entries. Entries are append-only.
 * Another backend only has to implement this interface.
 */
export interface AuditLog {
  append(entry: AuditEntry): Promise<void>;
  /** Entries newest first, limited to one flag when `flagKey` is given. */
  list(flagKey?: string): Promise<AuditEntry[]>;
}

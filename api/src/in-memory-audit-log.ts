import type { AuditEntry } from "@featureflagify/shared";
import type { AuditLog } from "./audit-log";

export class InMemoryAuditLog implements AuditLog {
  private readonly entries: AuditEntry[] = [];

  append(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
    return Promise.resolve();
  }

  list(flagKey?: string): Promise<AuditEntry[]> {
    // Insertion order is the write order, so reversing gives newest first
    // even when two entries share a timestamp.
    const newestFirst = [...this.entries].reverse();
    return Promise.resolve(
      flagKey === undefined ? newestFirst : newestFirst.filter((e) => e.flagKey === flagKey),
    );
  }
}

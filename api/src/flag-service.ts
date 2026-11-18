import {
  flagSchema,
  type AuditEntry,
  type CreateFlagBody,
  type Flag,
  type FlagValues,
} from "@featureflagify/shared";
import type { AuditLog } from "./audit-log";
import { FlagExistsError, FlagNotFoundError } from "./errors";
import type { FlagRepository } from "./flag-repository";
import type { Logger } from "./logger";

export interface FlagServiceDeps {
  repository: FlagRepository;
  auditLog: AuditLog;
  logger: Logger;
  now: () => Date;
  /** Generates a unique audit entry id. */
  newId: () => string;
}

/** Per-call context from the adapter. A missing actor is recorded as `anonymous`. */
export interface CallContext {
  actor?: string | undefined;
  requestId: string;
}

const ANONYMOUS = "anonymous";

/** Result of a toggle. `changed` is false when the value was already the requested one. */
export interface ToggleResult {
  flag: Flag;
  changed: boolean;
}

function recordKey(record: unknown): string | undefined {
  if (typeof record === "object" && record !== null && "key" in record) {
    return typeof record.key === "string" ? record.key : undefined;
  }
  return undefined;
}

export class FlagService {
  private readonly repository: FlagRepository;
  private readonly auditLog: AuditLog;
  private readonly logger: Logger;
  private readonly now: () => Date;
  private readonly newId: () => string;

  constructor(deps: FlagServiceDeps) {
    this.repository = deps.repository;
    this.auditLog = deps.auditLog;
    this.logger = deps.logger;
    this.now = deps.now;
    this.newId = deps.newId;
  }

  /** Input is already validated by the caller with `createFlagBodySchema`. */
  async create(input: CreateFlagBody, context: CallContext): Promise<Flag> {
    if ((await this.repository.findByKey(input.key)) !== undefined) {
      throw new FlagExistsError(input.key);
    }
    const at = this.now().toISOString();
    const flag: Flag = {
      key: input.key,
      name: input.name ?? input.key,
      description: input.description ?? "",
      enabled: input.enabled ?? false,
      createdAt: at,
      updatedAt: at,
    };
    await this.repository.insert(flag);
    await this.audit(
      { flagKey: flag.key, action: "created", before: null, after: flag.enabled, at },
      context,
    );
    this.logger.info("flag_created", {
      key: flag.key,
      enabled: flag.enabled,
      requestId: context.requestId,
    });
    return flag;
  }

  /**
   * Write ordering: the flag is stored first, then the audit entry is appended.
   * If the append throws, the flag stays stored (no rollback), the failure is
   * logged as `audit_append_failed` and the error propagates, so the caller
   * sees a failure. A change without an audit entry is possible in that case.
   */
  private async audit(
    change: Pick<AuditEntry, "flagKey" | "action" | "before" | "after" | "at">,
    context: CallContext,
  ): Promise<void> {
    const entry: AuditEntry = {
      id: this.newId(),
      ...change,
      actor: context.actor ?? ANONYMOUS,
      requestId: context.requestId,
    };
    try {
      await this.auditLog.append(entry);
    } catch (error) {
      this.logger.warn("audit_append_failed", {
        key: change.flagKey,
        requestId: context.requestId,
      });
      throw error;
    }
  }

  /** Valid flags, newest first. Corrupt records are skipped and logged. */
  async list(): Promise<Flag[]> {
    const records = await this.repository.findAll();
    const flags: Flag[] = [];
    for (const record of records) {
      const flag = this.parseRecord(record);
      if (flag !== undefined) {
        flags.push(flag);
      }
    }
    // Reverse first so flags created in the same millisecond keep newest-inserted first.
    return flags.reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Setting the current value succeeds with `changed: false` and writes nothing. */
  async toggle(key: string, enabled: boolean, context: CallContext): Promise<ToggleResult> {
    const flag = this.parseRecord(await this.repository.findByKey(key));
    if (flag === undefined) {
      throw new FlagNotFoundError(key);
    }
    if (flag.enabled === enabled) {
      return { flag, changed: false };
    }
    const updated: Flag = {
      ...flag,
      enabled,
      updatedAt: this.now().toISOString(),
    };
    await this.repository.update(updated);
    await this.audit(
      {
        flagKey: key,
        action: enabled ? "enabled" : "disabled",
        before: flag.enabled,
        after: enabled,
        at: updated.updatedAt,
      },
      context,
    );
    this.logger.info("flag_toggled", {
      key,
      before: flag.enabled,
      after: enabled,
      requestId: context.requestId,
    });
    return { flag: updated, changed: true };
  }

  /** Key-to-value map of every valid flag. */
  async evaluate(): Promise<FlagValues> {
    const values: FlagValues = {};
    for (const flag of await this.list()) {
      values[flag.key] = flag.enabled;
    }
    return values;
  }

  private parseRecord(record: unknown): Flag | undefined {
    if (record === undefined) {
      return undefined;
    }
    const result = flagSchema.safeParse(record);
    if (result.success) {
      return result.data;
    }
    this.logger.warn("flag_invalid_record", { key: recordKey(record) });
    return undefined;
  }
}

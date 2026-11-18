import { describe, expect, it } from "vitest";
import { auditEntrySchema, type Flag } from "@featureflagify/shared";
import {
  InMemoryAuditLog,
  type AuditLog,
  type CallContext,
  FlagExistsError,
  FlagNotFoundError,
  FlagService,
  InMemoryFlagRepository,
  type FlagRepository,
  type LogFields,
  type Logger,
} from "../src/index";

interface LogLine {
  level: "info" | "warn";
  event: string;
  fields: LogFields | undefined;
}

function recordingLogger(): { logger: Logger; lines: LogLine[] } {
  const lines: LogLine[] = [];
  return {
    lines,
    logger: {
      info: (event, fields) => lines.push({ level: "info", event, fields }),
      warn: (event, fields) => lines.push({ level: "warn", event, fields }),
    },
  };
}

const ctx: CallContext = { actor: "alice", requestId: "req-1" };

function counterIds(): () => string {
  let n = 0;
  return () => `audit-${++n}`;
}

function setup(start = "2026-01-01T00:00:00.000Z") {
  let current = new Date(start);
  const { logger, lines } = recordingLogger();
  const repository = new InMemoryFlagRepository();
  const auditLog = new InMemoryAuditLog();
  const service = new FlagService({
    repository,
    auditLog,
    logger,
    now: () => current,
    newId: counterIds(),
  });
  return {
    service,
    repository,
    auditLog,
    lines,
    setNow: (iso: string) => {
      current = new Date(iso);
    },
  };
}

describe("FlagService.create", () => {
  it("creates a flag that is off by default, named after its key", async () => {
    const { service } = setup();
    const flag = await service.create({ key: "new-checkout" }, ctx);
    expect(flag).toEqual({
      key: "new-checkout",
      name: "new-checkout",
      description: "",
      enabled: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("creates an enabled flag with the given name and description", async () => {
    const { service } = setup();
    const flag = await service.create({
      key: "dark-mode",
      name: "Dark mode",
      description: "Theme switch",
      enabled: true,
    }, ctx);
    expect(flag.enabled).toBe(true);
    expect(flag.name).toBe("Dark mode");
    expect(flag.description).toBe("Theme switch");
  });

  it("rejects a duplicate key and keeps the original", async () => {
    const { service } = setup();
    await service.create({ key: "dark-mode", enabled: true }, ctx);
    await expect(service.create({ key: "dark-mode" }, ctx)).rejects.toBeInstanceOf(
      FlagExistsError,
    );
    const flags = await service.list();
    expect(flags).toHaveLength(1);
    expect(flags[0]?.enabled).toBe(true);
  });
});

describe("FlagService.toggle", () => {
  it("updates enabled and updatedAt using the injected clock", async () => {
    const { service, setNow } = setup();
    await service.create({ key: "dark-mode" }, ctx);
    setNow("2026-02-02T10:00:00.000Z");
    const result = await service.toggle("dark-mode", true, ctx);
    expect(result.changed).toBe(true);
    expect(result.flag.enabled).toBe(true);
    expect(result.flag.updatedAt).toBe("2026-02-02T10:00:00.000Z");
    expect(result.flag.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(await service.list()).toEqual([result.flag]);
  });

  it("fails for an unknown key", async () => {
    const { service } = setup();
    await expect(service.toggle("missing", true, ctx)).rejects.toBeInstanceOf(
      FlagNotFoundError,
    );
  });

  it("accepts the current value, reports no change and writes nothing", async () => {
    const { service, setNow } = setup();
    const created = await service.create({ key: "dark-mode", enabled: true }, ctx);
    setNow("2026-02-02T10:00:00.000Z");
    const result = await service.toggle("dark-mode", true, ctx);
    expect(result).toEqual({ flag: created, changed: false });
    expect(await service.list()).toEqual([created]);
  });
});

describe("FlagService.list and evaluate", () => {
  it("lists newest first", async () => {
    const { service, setNow } = setup();
    await service.create({ key: "first-flag" }, ctx);
    setNow("2026-01-02T00:00:00.000Z");
    await service.create({ key: "second-flag" }, ctx);
    setNow("2026-01-03T00:00:00.000Z");
    await service.create({ key: "third-flag" }, ctx);
    const keys = (await service.list()).map((f) => f.key);
    expect(keys).toEqual(["third-flag", "second-flag", "first-flag"]);
  });

  it("lists flags created at the same instant newest-inserted first", async () => {
    const { service } = setup();
    await service.create({ key: "aa-flag" }, ctx);
    await service.create({ key: "bb-flag" }, ctx);
    expect((await service.list()).map((f) => f.key)).toEqual(["bb-flag", "aa-flag"]);
  });

  it("evaluates to a key-to-boolean map of every flag", async () => {
    const { service } = setup();
    await service.create({ key: "on-flag", enabled: true }, ctx);
    await service.create({ key: "off-flag" }, ctx);
    expect(await service.evaluate()).toEqual({ "on-flag": true, "off-flag": false });
  });

  it("evaluates to an empty map when there are no flags", async () => {
    const { service } = setup();
    expect(await service.evaluate()).toEqual({});
  });
});

describe("corrupt stored records", () => {
  const good: Flag = {
    key: "good-flag",
    name: "Good",
    description: "",
    enabled: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const bad = { ...good, key: "bad-flag", enabled: "yes" };

  function repositoryWith(records: readonly unknown[]): FlagRepository {
    return {
      findAll: () => Promise.resolve(records),
      findByKey: (key) =>
        Promise.resolve(
          records.find(
            (r) => typeof r === "object" && r !== null && "key" in r && r.key === key,
          ),
        ),
      insert: () => Promise.resolve(),
      update: () => Promise.resolve(),
    };
  }

  function serviceWith(records: readonly unknown[]) {
    const { logger, lines } = recordingLogger();
    const service = new FlagService({
      repository: repositoryWith(records),
      auditLog: new InMemoryAuditLog(),
      logger,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      newId: counterIds(),
    });
    return { service, lines };
  }

  it("skips the bad record in list and evaluate, keeps the good one, logs the key", async () => {
    const { service, lines } = serviceWith([bad, good]);

    expect(await service.list()).toEqual([good]);
    expect(await service.evaluate()).toEqual({ "good-flag": true });

    const invalid = lines.filter((l) => l.event === "flag_invalid_record");
    expect(invalid.length).toBeGreaterThan(0);
    for (const line of invalid) {
      expect(line.level).toBe("warn");
      expect(line.fields).toEqual({ key: "bad-flag" });
    }
  });

  it("logs an undefined key for a record that has none", async () => {
    const { service, lines } = serviceWith([42, good]);
    expect(await service.list()).toEqual([good]);
    expect(lines).toEqual([
      { level: "warn", event: "flag_invalid_record", fields: { key: undefined } },
    ]);
  });

  it("treats a corrupt record as not found on toggle", async () => {
    const { service } = serviceWith([bad, good]);
    await expect(service.toggle("bad-flag", true, ctx)).rejects.toBeInstanceOf(
      FlagNotFoundError,
    );
  });

  it("still toggles a good flag next to a corrupt one", async () => {
    const { service } = serviceWith([bad, good]);
    const result = await service.toggle("good-flag", false, ctx);
    expect(result.changed).toBe(true);
    expect(result.flag.enabled).toBe(false);
  });
});


describe("audit log", () => {
  it("create writes one created entry with before null and the initial value", async () => {
    const { service, auditLog } = setup();
    await service.create({ key: "dark-mode", enabled: true }, ctx);
    expect(await auditLog.list()).toEqual([
      {
        id: "audit-1",
        flagKey: "dark-mode",
        action: "created",
        before: null,
        after: true,
        actor: "alice",
        requestId: "req-1",
        at: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("records a created flag that starts disabled with after false", async () => {
    const { service, auditLog } = setup();
    await service.create({ key: "dark-mode" }, ctx);
    const [entry] = await auditLog.list();
    expect(entry?.after).toBe(false);
  });

  it("a toggle that enables writes one enabled entry with before and after", async () => {
    const { service, auditLog, setNow } = setup();
    await service.create({ key: "dark-mode" }, ctx);
    setNow("2026-02-02T10:00:00.000Z");
    await service.toggle("dark-mode", true, { actor: "bob", requestId: "req-2" });
    const [entry, ...rest] = await auditLog.list();
    expect(rest).toHaveLength(1);
    expect(entry).toEqual({
      id: "audit-2",
      flagKey: "dark-mode",
      action: "enabled",
      before: false,
      after: true,
      actor: "bob",
      requestId: "req-2",
      at: "2026-02-02T10:00:00.000Z",
    });
  });

  it("a toggle that disables writes one disabled entry with before and after", async () => {
    const { service, auditLog } = setup();
    await service.create({ key: "dark-mode", enabled: true }, ctx);
    await service.toggle("dark-mode", false, ctx);
    const [entry] = await auditLog.list();
    expect(entry).toMatchObject({ action: "disabled", before: true, after: false });
    expect(await auditLog.list()).toHaveLength(2);
  });

  it("a toggle to the current value writes no entry and no log line", async () => {
    const { service, auditLog, lines } = setup();
    await service.create({ key: "dark-mode", enabled: true }, ctx);
    const linesBefore = lines.length;
    const result = await service.toggle("dark-mode", true, ctx);
    expect(result.changed).toBe(false);
    expect(await auditLog.list()).toHaveLength(1);
    expect(lines).toHaveLength(linesBefore);
  });

  it("a duplicate create writes no entry", async () => {
    const { service, auditLog } = setup();
    await service.create({ key: "dark-mode" }, ctx);
    await expect(service.create({ key: "dark-mode" }, ctx)).rejects.toBeInstanceOf(
      FlagExistsError,
    );
    expect(await auditLog.list()).toHaveLength(1);
  });

  it("a toggle of an unknown key writes no entry", async () => {
    const { service, auditLog } = setup();
    await expect(service.toggle("missing", true, ctx)).rejects.toBeInstanceOf(
      FlagNotFoundError,
    );
    expect(await auditLog.list()).toEqual([]);
  });

  it("a toggle of a corrupt record writes no entry", async () => {
    const auditLog = new InMemoryAuditLog();
    const corrupt = { key: "bad-flag", enabled: "yes" };
    const repository: FlagRepository = {
      findAll: () => Promise.resolve([corrupt]),
      findByKey: () => Promise.resolve(corrupt),
      insert: () => Promise.resolve(),
      update: () => Promise.resolve(),
    };
    const service = new FlagService({
      repository,
      auditLog,
      logger: recordingLogger().logger,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      newId: counterIds(),
    });
    await expect(service.toggle("bad-flag", true, ctx)).rejects.toBeInstanceOf(
      FlagNotFoundError,
    );
    expect(await auditLog.list()).toEqual([]);
  });

  it("returns entries newest first, including entries in the same instant", async () => {
    const { service, auditLog, setNow } = setup();
    await service.create({ key: "aa-flag" }, ctx);
    setNow("2026-01-02T00:00:00.000Z");
    await service.toggle("aa-flag", true, ctx);
    await service.toggle("aa-flag", false, ctx);
    expect((await auditLog.list()).map((e) => e.id)).toEqual([
      "audit-3",
      "audit-2",
      "audit-1",
    ]);
  });

  it("filters by flag key", async () => {
    const { service, auditLog } = setup();
    await service.create({ key: "aa-flag" }, ctx);
    await service.create({ key: "bb-flag" }, ctx);
    await service.toggle("aa-flag", true, ctx);
    const entries = await auditLog.list("aa-flag");
    expect(entries.map((e) => [e.flagKey, e.action])).toEqual([
      ["aa-flag", "enabled"],
      ["aa-flag", "created"],
    ]);
    expect(await auditLog.list("missing-flag")).toEqual([]);
  });

  it("records a missing actor as anonymous", async () => {
    const { service, auditLog } = setup();
    await service.create({ key: "dark-mode" }, { requestId: "req-9" });
    await service.toggle("dark-mode", true, { actor: undefined, requestId: "req-10" });
    const actors = (await auditLog.list()).map((e) => e.actor);
    expect(actors).toEqual(["anonymous", "anonymous"]);
  });

  it("writes entries that validate against the shared schema", async () => {
    const { service, auditLog } = setup();
    await service.create({ key: "dark-mode" }, ctx);
    await service.toggle("dark-mode", true, ctx);
    const entries = await auditLog.list();
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(auditEntrySchema.safeParse(entry).success).toBe(true);
    }
  });

  it("logs flag_created and flag_toggled with the request id", async () => {
    const { service, lines } = setup();
    await service.create({ key: "dark-mode" }, ctx);
    await service.toggle("dark-mode", true, { requestId: "req-2" });
    expect(lines).toEqual([
      {
        level: "info",
        event: "flag_created",
        fields: { key: "dark-mode", enabled: false, requestId: "req-1" },
      },
      {
        level: "info",
        event: "flag_toggled",
        fields: { key: "dark-mode", before: false, after: true, requestId: "req-2" },
      },
    ]);
  });

  it("keeps the stored flag and rethrows when the audit append fails", async () => {
    const failing: AuditLog = {
      append: () => Promise.reject(new Error("disk full")),
      list: () => Promise.resolve([]),
    };
    const { logger, lines } = recordingLogger();
    const repository = new InMemoryFlagRepository();
    const service = new FlagService({
      repository,
      auditLog: failing,
      logger,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      newId: counterIds(),
    });
    await expect(service.create({ key: "dark-mode" }, ctx)).rejects.toThrow("disk full");
    expect(await service.list()).toHaveLength(1);
    expect(lines.map((l) => l.event)).toContain("audit_append_failed");
    expect(lines.map((l) => l.event)).not.toContain("flag_created");
  });
});

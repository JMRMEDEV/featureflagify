import { describe, expect, it } from "vitest";
import type { Flag } from "@featureflagify/shared";
import {
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

function setup(start = "2026-01-01T00:00:00.000Z") {
  let current = new Date(start);
  const { logger, lines } = recordingLogger();
  const repository = new InMemoryFlagRepository();
  const service = new FlagService({ repository, logger, now: () => current });
  return {
    service,
    repository,
    lines,
    setNow: (iso: string) => {
      current = new Date(iso);
    },
  };
}

describe("FlagService.create", () => {
  it("creates a flag that is off by default, named after its key", async () => {
    const { service } = setup();
    const flag = await service.create({ key: "new-checkout" });
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
    });
    expect(flag.enabled).toBe(true);
    expect(flag.name).toBe("Dark mode");
    expect(flag.description).toBe("Theme switch");
  });

  it("rejects a duplicate key and keeps the original", async () => {
    const { service } = setup();
    await service.create({ key: "dark-mode", enabled: true });
    await expect(service.create({ key: "dark-mode" })).rejects.toBeInstanceOf(
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
    await service.create({ key: "dark-mode" });
    setNow("2026-02-02T10:00:00.000Z");
    const result = await service.toggle("dark-mode", true);
    expect(result.changed).toBe(true);
    expect(result.flag.enabled).toBe(true);
    expect(result.flag.updatedAt).toBe("2026-02-02T10:00:00.000Z");
    expect(result.flag.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(await service.list()).toEqual([result.flag]);
  });

  it("fails for an unknown key", async () => {
    const { service } = setup();
    await expect(service.toggle("missing", true)).rejects.toBeInstanceOf(
      FlagNotFoundError,
    );
  });

  it("accepts the current value, reports no change and writes nothing", async () => {
    const { service, setNow } = setup();
    const created = await service.create({ key: "dark-mode", enabled: true });
    setNow("2026-02-02T10:00:00.000Z");
    const result = await service.toggle("dark-mode", true);
    expect(result).toEqual({ flag: created, changed: false });
    expect(await service.list()).toEqual([created]);
  });
});

describe("FlagService.list and evaluate", () => {
  it("lists newest first", async () => {
    const { service, setNow } = setup();
    await service.create({ key: "first-flag" });
    setNow("2026-01-02T00:00:00.000Z");
    await service.create({ key: "second-flag" });
    setNow("2026-01-03T00:00:00.000Z");
    await service.create({ key: "third-flag" });
    const keys = (await service.list()).map((f) => f.key);
    expect(keys).toEqual(["third-flag", "second-flag", "first-flag"]);
  });

  it("lists flags created at the same instant newest-inserted first", async () => {
    const { service } = setup();
    await service.create({ key: "aa-flag" });
    await service.create({ key: "bb-flag" });
    expect((await service.list()).map((f) => f.key)).toEqual(["bb-flag", "aa-flag"]);
  });

  it("evaluates to a key-to-boolean map of every flag", async () => {
    const { service } = setup();
    await service.create({ key: "on-flag", enabled: true });
    await service.create({ key: "off-flag" });
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
      logger,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
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
    await expect(service.toggle("bad-flag", true)).rejects.toBeInstanceOf(
      FlagNotFoundError,
    );
  });

  it("still toggles a good flag next to a corrupt one", async () => {
    const { service } = serviceWith([bad, good]);
    const result = await service.toggle("good-flag", false);
    expect(result.changed).toBe(true);
    expect(result.flag.enabled).toBe(false);
  });
});

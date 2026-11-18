import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  auditResponseSchema,
  errorEnvelopeSchema,
  evaluateResponseSchema,
  flagResponseSchema,
  healthResponseSchema,
  listFlagsResponseSchema,
  type AuditEntry,
  type ErrorEnvelope,
  type Flag,
} from "@featureflagify/shared";
import {
  createJsonLogger,
  FlagService,
  InMemoryAuditLog,
  InMemoryFlagRepository,
  type AuditLog,
  type FlagRepository,
} from "../src/index";
import { buildApp } from "../src/http/app";
import { currentRequestFields } from "../src/http/request-context";

const ORIGIN = "http://localhost:5173";
const NOW = "2026-01-01T00:00:00.000Z";

const CORRUPT_RECORD = { key: "broken-flag", enabled: "yes" };

/** Holds one stored record that fails the flag schema, next to whatever is inserted. */
class CorruptRecordRepository extends InMemoryFlagRepository {
  override async findAll(): Promise<readonly unknown[]> {
    return [...(await super.findAll()), CORRUPT_RECORD];
  }

  override async findByKey(key: string): Promise<unknown> {
    return key === CORRUPT_RECORD.key ? CORRUPT_RECORD : super.findByKey(key);
  }
}

class FailingAppendAuditLog extends InMemoryAuditLog {
  override append(): Promise<void> {
    return Promise.reject(new Error("disk full at /secret/path"));
  }
}

class FailingListAuditLog extends InMemoryAuditLog {
  override list(): Promise<AuditEntry[]> {
    return Promise.reject(new Error("audit store down"));
  }
}

class FailingFindAllRepository extends InMemoryFlagRepository {
  override findAll(): Promise<readonly unknown[]> {
    return Promise.reject(new Error("db password=hunter2 refused"));
  }
}

const logLineSchema = z.record(z.string(), z.unknown());

const apps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function setup(
  options: { repository?: FlagRepository; auditLog?: AuditLog } = {},
) {
  const repository = options.repository ?? new InMemoryFlagRepository();
  const auditLog = options.auditLog ?? new InMemoryAuditLog();
  const written: string[] = [];
  const logger = createJsonLogger({
    write: (line) => written.push(line),
    now: () => new Date(NOW),
    context: currentRequestFields,
  });
  let auditCounter = 0;
  let requestCounter = 0;
  const service = new FlagService({
    repository,
    auditLog,
    logger,
    now: () => new Date(NOW),
    newId: () => `audit-${++auditCounter}`,
  });
  const app = await buildApp({
    service,
    auditLog,
    logger,
    newRequestId: () => `gen-${++requestCounter}`,
    corsOrigin: ORIGIN,
  });
  apps.push(app);
  return {
    app,
    repository,
    auditLog,
    logLines: () => written.map((line) => logLineSchema.parse(JSON.parse(line))),
    rawLogLines: written,
  };
}

function errorOf(response: LightMyRequestResponse): ErrorEnvelope {
  return errorEnvelopeSchema.parse(response.json<unknown>());
}

async function createFlag(app: FastifyInstance, key: string, extra: object = {}): Promise<Flag> {
  const response = await app.inject({
    method: "POST",
    url: "/flags",
    payload: { key, ...extra },
  });
  expect(response.statusCode).toBe(201);
  return flagResponseSchema.parse(response.json<unknown>()).data.flag;
}

describe("GET /health", () => {
  it("returns ok", async () => {
    const { app } = await setup();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json<unknown>())).toEqual({
      data: { status: "ok" },
    });
  });
});

describe("POST /flags", () => {
  it("creates a flag with 201 and wraps it in data", async () => {
    const { app, repository } = await setup();
    const response = await app.inject({
      method: "POST",
      url: "/flags",
      payload: { key: "new-checkout", description: "Checkout v2", enabled: true },
    });
    expect(response.statusCode).toBe(201);
    expect(flagResponseSchema.parse(response.json<unknown>())).toEqual({
      data: {
        flag: {
          key: "new-checkout",
          name: "new-checkout",
          description: "Checkout v2",
          enabled: true,
          createdAt: NOW,
          updatedAt: NOW,
        },
      },
    });
    expect(await repository.findAll()).toHaveLength(1);
  });

  it("records x-actor in the audit entry", async () => {
    const { app, auditLog } = await setup();
    await app.inject({
      method: "POST",
      url: "/flags",
      headers: { "x-actor": "alice", "x-request-id": "req-77" },
      payload: { key: "new-checkout" },
    });
    expect(await auditLog.list()).toEqual([
      {
        id: "audit-1",
        flagKey: "new-checkout",
        action: "created",
        before: null,
        after: false,
        actor: "alice",
        requestId: "req-77",
        at: NOW,
      },
    ]);
  });

  it("records anonymous when x-actor is absent", async () => {
    const { app, auditLog } = await setup();
    await createFlag(app, "new-checkout");
    const [entry] = await auditLog.list();
    expect(entry?.actor).toBe("anonymous");
  });

  it("returns 409 FLAG_EXISTS for a duplicate key and writes nothing", async () => {
    const { app, repository, auditLog } = await setup();
    await createFlag(app, "new-checkout");
    const flagsBefore = await repository.findAll();
    const auditBefore = await auditLog.list();

    const response = await app.inject({
      method: "POST",
      url: "/flags",
      payload: { key: "new-checkout", enabled: true },
    });

    expect(response.statusCode).toBe(409);
    const body = errorOf(response);
    expect(body.error.code).toBe("FLAG_EXISTS");
    expect(body.error.details).toBeUndefined();
    expect(await repository.findAll()).toEqual(flagsBefore);
    expect(await auditLog.list()).toEqual(auditBefore);
  });

  it.each([
    ["an invalid key", { key: "Bad_Key" }, "key"],
    ["an unknown field", { key: "new-checkout", extra: 1 }, "extra"],
    ["a wrong type", { key: "new-checkout", enabled: "yes" }, "enabled"],
    ["a name that is too long", { key: "new-checkout", name: "x".repeat(101) }, "name"],
    ["a missing key", { name: "No key" }, "key"],
  ])("returns 400 VALIDATION_ERROR for %s and writes nothing", async (_label, payload, field) => {
    const { app, repository, auditLog } = await setup();

    const response = await app.inject({ method: "POST", url: "/flags", payload });

    expect(response.statusCode).toBe(400);
    const body = errorOf(response);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details?.map((d) => d.field)).toContain(field);
    for (const detail of body.error.details ?? []) {
      expect(detail.message.length).toBeGreaterThan(0);
    }
    expect(await repository.findAll()).toEqual([]);
    expect(await auditLog.list()).toEqual([]);
  });

  it("reports every failing field, one detail each", async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: "POST",
      url: "/flags",
      payload: { key: "BAD", enabled: 3, one: 1, two: 2 },
    });
    const fields = errorOf(response).error.details?.map((d) => d.field).sort();
    expect(fields).toEqual(["enabled", "key", "one", "two"]);
  });

  it("returns 400 for a malformed JSON body and writes nothing", async () => {
    const { app, repository, auditLog } = await setup();
    const response = await app.inject({
      method: "POST",
      url: "/flags",
      headers: { "content-type": "application/json" },
      payload: '{"key": "new-checkout",',
    });
    expect(response.statusCode).toBe(400);
    const body = errorOf(response);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details?.[0]?.field).toBe("body");
    expect(await repository.findAll()).toEqual([]);
    expect(await auditLog.list()).toEqual([]);
  });

  it("returns 400 when the body is missing or not an object", async () => {
    const { app } = await setup();
    const missing = await app.inject({ method: "POST", url: "/flags" });
    expect(missing.statusCode).toBe(400);
    expect(errorOf(missing).error.details?.[0]?.field).toBe("body");

    const array = await app.inject({ method: "POST", url: "/flags", payload: [] });
    expect(array.statusCode).toBe(400);
    expect(errorOf(array).error.code).toBe("VALIDATION_ERROR");
  });

  it.each([
    ["empty", ""],
    ["over 100 characters", "a".repeat(101)],
  ])("returns 400 for an x-actor that is %s and writes nothing", async (_label, actor) => {
    const { app, repository, auditLog } = await setup();
    const response = await app.inject({
      method: "POST",
      url: "/flags",
      headers: { "x-actor": actor },
      payload: { key: "new-checkout" },
    });
    expect(response.statusCode).toBe(400);
    const body = errorOf(response);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details?.map((d) => d.field)).toEqual(["x-actor"]);
    expect(await repository.findAll()).toEqual([]);
    expect(await auditLog.list()).toEqual([]);
  });

  it("accepts an x-actor of exactly 100 characters", async () => {
    const { app, auditLog } = await setup();
    const actor = "a".repeat(100);
    await app.inject({
      method: "POST",
      url: "/flags",
      headers: { "x-actor": actor },
      payload: { key: "new-checkout" },
    });
    expect((await auditLog.list())[0]?.actor).toBe(actor);
  });
});

describe("GET /flags", () => {
  it("lists flags newest first", async () => {
    const { app } = await setup();
    await createFlag(app, "first-flag");
    await createFlag(app, "second-flag");
    const response = await app.inject({ method: "GET", url: "/flags" });
    expect(response.statusCode).toBe(200);
    const keys = listFlagsResponseSchema
      .parse(response.json<unknown>())
      .data.flags.map((f) => f.key);
    expect(keys).toEqual(["second-flag", "first-flag"]);
  });

  it("returns an empty list when there are no flags", async () => {
    const { app } = await setup();
    const response = await app.inject({ method: "GET", url: "/flags" });
    expect(listFlagsResponseSchema.parse(response.json<unknown>())).toEqual({
      data: { flags: [] },
    });
  });

  it("skips a corrupt record and logs flag_invalid_record with the request id", async () => {
    const { app, logLines } = await setup({ repository: new CorruptRecordRepository() });
    await createFlag(app, "good-flag");
    const response = await app.inject({
      method: "GET",
      url: "/flags",
      headers: { "x-request-id": "req-corrupt" },
    });
    expect(response.statusCode).toBe(200);
    expect(
      listFlagsResponseSchema.parse(response.json<unknown>()).data.flags.map((f) => f.key),
    ).toEqual(["good-flag"]);
    const line = logLines().find((l) => l["event"] === "flag_invalid_record");
    expect(line).toMatchObject({ key: "broken-flag", requestId: "req-corrupt" });
  });
});

describe("PATCH /flags/:key", () => {
  it("enables a flag and records the actor", async () => {
    const { app, auditLog } = await setup();
    await createFlag(app, "new-checkout");
    const response = await app.inject({
      method: "PATCH",
      url: "/flags/new-checkout",
      headers: { "x-actor": "bob", "x-request-id": "req-patch" },
      payload: { enabled: true },
    });
    expect(response.statusCode).toBe(200);
    expect(flagResponseSchema.parse(response.json<unknown>()).data.flag.enabled).toBe(true);
    const [latest] = await auditLog.list();
    expect(latest).toMatchObject({
      action: "enabled",
      before: false,
      after: true,
      actor: "bob",
      requestId: "req-patch",
    });
  });

  it("accepts a toggle to the current value without an audit entry", async () => {
    const { app, auditLog } = await setup();
    await createFlag(app, "new-checkout");
    const auditBefore = await auditLog.list();
    const response = await app.inject({
      method: "PATCH",
      url: "/flags/new-checkout",
      payload: { enabled: false },
    });
    expect(response.statusCode).toBe(200);
    expect(await auditLog.list()).toEqual(auditBefore);
  });

  it("returns 404 FLAG_NOT_FOUND for an unknown key and writes nothing", async () => {
    const { app, repository, auditLog } = await setup();
    await createFlag(app, "known-flag");
    const flagsBefore = await repository.findAll();
    const auditBefore = await auditLog.list();

    const response = await app.inject({
      method: "PATCH",
      url: "/flags/unknown-flag",
      payload: { enabled: true },
    });

    expect(response.statusCode).toBe(404);
    expect(errorOf(response).error.code).toBe("FLAG_NOT_FOUND");
    expect(await repository.findAll()).toEqual(flagsBefore);
    expect(await auditLog.list()).toEqual(auditBefore);
  });

  it("returns 404 for PATCH and 409 for POST on a corrupt stored record", async () => {
    const { app, repository, auditLog } = await setup({
      repository: new CorruptRecordRepository(),
    });
    const flagsBefore = await repository.findAll();
    const patch = await app.inject({
      method: "PATCH",
      url: "/flags/broken-flag",
      payload: { enabled: true },
    });
    expect(patch.statusCode).toBe(404);
    expect(errorOf(patch).error.code).toBe("FLAG_NOT_FOUND");
    const post = await app.inject({
      method: "POST",
      url: "/flags",
      payload: { key: "broken-flag" },
    });
    expect(post.statusCode).toBe(409);
    expect(errorOf(post).error.code).toBe("FLAG_EXISTS");
    expect(await repository.findAll()).toEqual(flagsBefore);
    expect(await auditLog.list()).toEqual([]);
  });

  it.each([
    ["an invalid key", "/flags/Bad_Key", { enabled: true }, "key"],
    ["an unknown field", "/flags/new-checkout", { enabled: true, extra: 1 }, "extra"],
    ["a wrong type", "/flags/new-checkout", { enabled: "true" }, "enabled"],
    ["a missing enabled", "/flags/new-checkout", {}, "enabled"],
  ])("returns 400 for %s and leaves state unchanged", async (_label, url, payload, field) => {
    const { app, repository, auditLog } = await setup();
    await createFlag(app, "new-checkout");
    const flagsBefore = await repository.findAll();
    const auditBefore = await auditLog.list();

    const response = await app.inject({ method: "PATCH", url, payload });

    expect(response.statusCode).toBe(400);
    const body = errorOf(response);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details?.map((d) => d.field)).toContain(field);
    expect(await repository.findAll()).toEqual(flagsBefore);
    expect(await auditLog.list()).toEqual(auditBefore);
  });

  it("returns 400 for an invalid x-actor and leaves state unchanged", async () => {
    const { app, repository, auditLog } = await setup();
    await createFlag(app, "new-checkout");
    const flagsBefore = await repository.findAll();
    const auditBefore = await auditLog.list();
    const response = await app.inject({
      method: "PATCH",
      url: "/flags/new-checkout",
      headers: { "x-actor": "" },
      payload: { enabled: true },
    });
    expect(response.statusCode).toBe(400);
    expect(errorOf(response).error.details?.map((d) => d.field)).toEqual(["x-actor"]);
    expect(await repository.findAll()).toEqual(flagsBefore);
    expect(await auditLog.list()).toEqual(auditBefore);
  });

  it("returns 400 for malformed JSON", async () => {
    const { app } = await setup();
    await createFlag(app, "new-checkout");
    const response = await app.inject({
      method: "PATCH",
      url: "/flags/new-checkout",
      headers: { "content-type": "application/json" },
      payload: "{enabled: true",
    });
    expect(response.statusCode).toBe(400);
    expect(errorOf(response).error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /evaluate", () => {
  it("returns a key to boolean map", async () => {
    const { app } = await setup();
    await createFlag(app, "on-flag", { enabled: true });
    await createFlag(app, "off-flag");
    const response = await app.inject({ method: "GET", url: "/evaluate" });
    expect(response.statusCode).toBe(200);
    expect(evaluateResponseSchema.parse(response.json<unknown>())).toEqual({
      data: { flags: { "on-flag": true, "off-flag": false } },
    });
  });

  it("omits a corrupt record and an unknown key, and never returns 404", async () => {
    const { app } = await setup({ repository: new CorruptRecordRepository() });
    await createFlag(app, "good-flag");
    const response = await app.inject({ method: "GET", url: "/evaluate" });
    expect(response.statusCode).toBe(200);
    const { flags } = evaluateResponseSchema.parse(response.json<unknown>()).data;
    expect(flags).toEqual({ "good-flag": false });
    expect("unknown-flag" in flags).toBe(false);
    expect("broken-flag" in flags).toBe(false);
  });

  it("returns an empty map when there are no flags", async () => {
    const { app } = await setup();
    const response = await app.inject({ method: "GET", url: "/evaluate" });
    expect(response.statusCode).toBe(200);
    expect(evaluateResponseSchema.parse(response.json<unknown>())).toEqual({
      data: { flags: {} },
    });
  });
});

describe("GET /audit", () => {
  it("returns entries newest first and filters with ?flag=", async () => {
    const { app } = await setup();
    await createFlag(app, "first-flag");
    await createFlag(app, "second-flag");
    await app.inject({ method: "PATCH", url: "/flags/first-flag", payload: { enabled: true } });

    const all = await app.inject({ method: "GET", url: "/audit" });
    expect(all.statusCode).toBe(200);
    expect(
      auditResponseSchema.parse(all.json<unknown>()).data.entries.map((e) => [e.flagKey, e.action]),
    ).toEqual([
      ["first-flag", "enabled"],
      ["second-flag", "created"],
      ["first-flag", "created"],
    ]);

    const filtered = await app.inject({ method: "GET", url: "/audit?flag=second-flag" });
    expect(
      auditResponseSchema.parse(filtered.json<unknown>()).data.entries.map((e) => e.flagKey),
    ).toEqual(["second-flag"]);
  });

  it("returns an empty list for a valid key with no entries", async () => {
    const { app } = await setup();
    const response = await app.inject({ method: "GET", url: "/audit?flag=nothing-here" });
    expect(response.statusCode).toBe(200);
    expect(auditResponseSchema.parse(response.json<unknown>())).toEqual({
      data: { entries: [] },
    });
  });

  it.each([
    ["an invalid key", "/audit?flag=Bad_Key", "flag"],
    ["an empty value", "/audit?flag=", "flag"],
    ["a repeated parameter", "/audit?flag=aa&flag=bb", "flag"],
    ["an unknown parameter", "/audit?other=1", "other"],
  ])("returns 400 for %s", async (_label, url, field) => {
    const { app } = await setup();
    const response = await app.inject({ method: "GET", url });
    expect(response.statusCode).toBe(400);
    const body = errorOf(response);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details?.map((d) => d.field)).toContain(field);
  });
});

describe("unknown routes", () => {
  it("return 404 in the error envelope with a request id", async () => {
    const { app } = await setup();
    const response = await app.inject({ method: "GET", url: "/nope" });
    expect(response.statusCode).toBe(404);
    const body = errorOf(response);
    expect(body.error.code).toBe("FLAG_NOT_FOUND");
    expect(body.error.requestId).toBe(response.headers["x-request-id"]);
  });

  it("return 404 for a method the contract does not define", async () => {
    const { app } = await setup();
    const response = await app.inject({ method: "DELETE", url: "/flags/new-checkout" });
    expect(response.statusCode).toBe(404);
    expect(errorOf(response).error.code).toBe("FLAG_NOT_FOUND");
  });
});

describe("unexpected errors", () => {
  it("returns a generic 500 when the service throws, with no internal detail", async () => {
    const { app, rawLogLines } = await setup({ repository: new FailingFindAllRepository() });
    const response = await app.inject({
      method: "GET",
      url: "/flags",
      headers: { "x-request-id": "req-500" },
    });
    expect(response.statusCode).toBe(500);
    const body = errorOf(response);
    expect(body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong", requestId: "req-500" },
    });
    expect(response.body).not.toMatch(/hunter2|password|refused|stack|at .*\.ts/i);
    expect(rawLogLines.some((l) => l.includes("request_failed"))).toBe(true);
  });

  it("returns a generic 500 when the audit append fails", async () => {
    const { app, repository, logLines } = await setup({ auditLog: new FailingAppendAuditLog() });
    const response = await app.inject({
      method: "POST",
      url: "/flags",
      headers: { "x-request-id": "req-audit" },
      payload: { key: "new-checkout" },
    });
    expect(response.statusCode).toBe(500);
    expect(errorOf(response).error).toEqual({
      code: "INTERNAL_ERROR",
      message: "Something went wrong",
      requestId: "req-audit",
    });
    expect(response.body).not.toMatch(/disk|secret|path|stack/i);
    expect(logLines().map((l) => l["event"])).toContain("audit_append_failed");
    // The service documents that the flag stays stored when the append fails.
    expect(await repository.findAll()).toHaveLength(1);
  });

  it("returns a generic 500 when listing the audit log fails", async () => {
    const { app } = await setup({ auditLog: new FailingListAuditLog() });
    const response = await app.inject({ method: "GET", url: "/audit" });
    expect(response.statusCode).toBe(500);
    expect(errorOf(response).error.code).toBe("INTERNAL_ERROR");
    expect(response.body).not.toContain("audit store down");
  });
});

describe("request id", () => {
  it("accepts a valid x-request-id and returns it", async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": "client id 42" },
    });
    expect(response.headers["x-request-id"]).toBe("client id 42");
  });

  it("generates an id when the header is absent", async () => {
    const { app } = await setup();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.headers["x-request-id"]).toBe("gen-1");
  });

  it.each([
    ["empty", ""],
    ["over 128 characters", "r".repeat(129)],
    ["non-printable", "bad\tid"],
    ["non-ASCII", "id-é"],
  ])("replaces an x-request-id that is %s", async (_label, value) => {
    const { app } = await setup();
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": value },
    });
    expect(response.headers["x-request-id"]).toBe("gen-1");
  });

  it("accepts an id of exactly 128 characters", async () => {
    const { app } = await setup();
    const id = "r".repeat(128);
    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-request-id": id },
    });
    expect(response.headers["x-request-id"]).toBe(id);
  });

  it("appears in the header and body of 400, 404, 409 and 500 responses", async () => {
    const failing = await setup({ repository: new FailingFindAllRepository() });
    const normal = await setup();
    await createFlag(normal.app, "new-checkout");
    interface Case {
      app: FastifyInstance;
      method: "GET" | "POST" | "PATCH";
      url: string;
      payload?: object;
      status: number;
    }
    const cases: Case[] = [
      { app: normal.app, method: "POST", url: "/flags", payload: { key: "BAD" }, status: 400 },
      {
        app: normal.app,
        method: "PATCH",
        url: "/flags/missing-flag",
        payload: { enabled: true },
        status: 404,
      },
      {
        app: normal.app,
        method: "POST",
        url: "/flags",
        payload: { key: "new-checkout" },
        status: 409,
      },
      { app: failing.app, method: "GET", url: "/flags", status: 500 },
    ];
    for (const { app, status, ...request } of cases) {
      const response = await app.inject({
        ...request,
        headers: { "x-request-id": `req-${status}` },
      });
      expect(response.statusCode).toBe(status);
      expect(response.headers["x-request-id"]).toBe(`req-${status}`);
      expect(errorOf(response).error.requestId).toBe(`req-${status}`);
    }
  });

  it("appears in every log line produced during a request", async () => {
    const { app, logLines } = await setup();
    await app.inject({
      method: "POST",
      url: "/flags",
      headers: { "x-request-id": "req-log" },
      payload: { key: "new-checkout" },
    });
    const lines = logLines();
    expect(lines.map((l) => l["event"])).toEqual(["flag_created", "request_completed"]);
    for (const line of lines) {
      expect(line["requestId"]).toBe("req-log");
    }
  });
});

describe("logging", () => {
  it("writes JSON with an event on every line and logs request_completed fields", async () => {
    const { app, logLines, rawLogLines } = await setup();
    await createFlag(app, "new-checkout");
    await app.inject({ method: "GET", url: "/audit?flag=new-checkout" });
    await app.inject({ method: "GET", url: "/nope" });

    expect(rawLogLines.length).toBeGreaterThan(0);
    for (const line of logLines()) {
      expect(typeof line["event"]).toBe("string");
      expect(typeof line["requestId"]).toBe("string");
    }
    const completed = logLines().filter((l) => l["event"] === "request_completed");
    expect(completed.map((l) => [l["method"], l["path"], l["status"]])).toEqual([
      ["POST", "/flags", 201],
      ["GET", "/audit", 200],
      ["GET", "/nope", 404],
    ]);
  });

  it("does not log request bodies or headers other than the request id", async () => {
    const { app, rawLogLines } = await setup();
    await app.inject({
      method: "POST",
      url: "/flags",
      headers: { "x-actor": "alice", authorization: "Bearer topsecret-token" },
      payload: { key: "new-checkout", description: "private-description" },
    });
    const text = rawLogLines.join("\n");
    expect(text).not.toContain("topsecret-token");
    expect(text).not.toContain("private-description");
    expect(text).not.toContain("authorization");
  });
});

describe("CORS", () => {
  it("echoes the allowed origin and exposes x-request-id", async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: "GET",
      url: "/evaluate",
      headers: { origin: ORIGIN },
    });
    expect(response.headers["access-control-allow-origin"]).toBe(ORIGIN);
    expect(response.headers["access-control-expose-headers"]).toBe("x-request-id");
    expect(response.headers["vary"]).toMatch(/origin/i);
  });

  it("does not allow another origin", async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: "GET",
      url: "/evaluate",
      headers: { origin: "http://evil.example" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("answers a PATCH preflight for the allowed origin with only the needed methods and headers", async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: "OPTIONS",
      url: "/flags/new-checkout",
      headers: {
        origin: ORIGIN,
        "access-control-request-method": "PATCH",
        "access-control-request-headers": "content-type,x-actor",
      },
    });
    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(ORIGIN);
    expect(response.headers["access-control-allow-methods"]).toBe("GET, POST, PATCH");
    expect(response.headers["access-control-allow-headers"]).toBe(
      "content-type, x-request-id, x-actor",
    );
    expect(response.headers["x-request-id"]).toBe("gen-1");
  });

  it("does not grant a preflight to another origin", async () => {
    const { app } = await setup();
    const response = await app.inject({
      method: "OPTIONS",
      url: "/flags/new-checkout",
      headers: {
        origin: "http://evil.example",
        "access-control-request-method": "PATCH",
      },
    });
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

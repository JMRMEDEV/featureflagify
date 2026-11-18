import { describe, expect, it } from "vitest";
import {
  auditQuerySchema,
  auditResponseSchema,
  createFlagBodySchema,
  evaluateResponseSchema,
  healthResponseSchema,
  listFlagsResponseSchema,
  toggleFlagBodySchema,
  type CreateFlagBody,
  type FlagValues,
} from "./api";
import { errorEnvelopeSchema } from "./error";
import { auditEntrySchema, flagSchema } from "./flag";

const at = "2026-11-18T16:00:00.000Z";
const flag = {
  key: "new-checkout",
  name: "new-checkout",
  description: "",
  enabled: false,
  createdAt: at,
  updatedAt: at,
};

describe("createFlagBodySchema", () => {
  it("accepts key only and the full body", () => {
    expect(createFlagBodySchema.safeParse({ key: "new-checkout" }).success).toBe(true);
    const full: CreateFlagBody = {
      key: "new-checkout",
      name: "New checkout",
      description: "x".repeat(500),
      enabled: true,
    };
    expect(createFlagBodySchema.parse(full)).toEqual(full);
  });

  it("rejects unknown fields", () => {
    expect(createFlagBodySchema.safeParse({ key: "new-checkout", extra: 1 }).success).toBe(false);
    expect(createFlagBodySchema.safeParse({ key: "new-checkout", createdAt: at }).success).toBe(false);
  });

  it("rejects wrong types and limits", () => {
    const bad = [
      {},
      { key: "Bad_Key" },
      { key: 1 },
      { key: "new-checkout", name: 5 },
      { key: "new-checkout", name: "" },
      { key: "new-checkout", name: "x".repeat(101) },
      { key: "new-checkout", description: "x".repeat(501) },
      { key: "new-checkout", enabled: "true" },
      { key: "new-checkout", enabled: 1 },
    ];
    for (const body of bad) {
      expect(createFlagBodySchema.safeParse(body).success).toBe(false);
    }
  });

  it("rejects non-object bodies", () => {
    for (const body of [null, undefined, "x", 1, []]) {
      expect(createFlagBodySchema.safeParse(body).success).toBe(false);
    }
  });
});

describe("toggleFlagBodySchema", () => {
  it("accepts a boolean", () => {
    expect(toggleFlagBodySchema.parse({ enabled: false })).toEqual({ enabled: false });
  });

  it("rejects unknown fields, missing field and wrong types", () => {
    const bad = [{}, { enabled: "true" }, { enabled: 1 }, { enabled: null }, { enabled: true, key: "a-b" }];
    for (const body of bad) {
      expect(toggleFlagBodySchema.safeParse(body).success).toBe(false);
    }
  });
});

describe("auditQuerySchema", () => {
  it("accepts no flag or a valid flag, rejects invalid key and unknown params", () => {
    expect(auditQuerySchema.safeParse({}).success).toBe(true);
    expect(auditQuerySchema.safeParse({ flag: "new-checkout" }).success).toBe(true);
    expect(auditQuerySchema.safeParse({ flag: "Bad" }).success).toBe(false);
    expect(auditQuerySchema.safeParse({ other: "x" }).success).toBe(false);
  });
});

describe("flagSchema", () => {
  it("accepts a flag and rejects bad fields", () => {
    expect(flagSchema.safeParse(flag).success).toBe(true);
    expect(flagSchema.safeParse({ ...flag, key: "Bad" }).success).toBe(false);
    expect(flagSchema.safeParse({ ...flag, enabled: "no" }).success).toBe(false);
    expect(flagSchema.safeParse({ ...flag, createdAt: "yesterday" }).success).toBe(false);
    expect(flagSchema.safeParse({ ...flag, name: "" }).success).toBe(false);
  });
});

describe("responses", () => {
  it("parses the list response", () => {
    expect(listFlagsResponseSchema.parse({ data: { flags: [flag] } }).data.flags).toHaveLength(1);
    expect(listFlagsResponseSchema.safeParse({ flags: [flag] }).success).toBe(false);
  });

  it("parses the evaluate map of booleans", () => {
    const values: FlagValues = { "new-checkout": true, "beta-ui": false };
    expect(evaluateResponseSchema.parse({ data: { flags: values } }).data.flags).toEqual(values);
    expect(evaluateResponseSchema.safeParse({ data: { flags: { a: "true" } } }).success).toBe(false);
    expect(evaluateResponseSchema.safeParse({ data: { flags: { a: 1 } } }).success).toBe(false);
  });

  it("parses health and audit responses", () => {
    expect(healthResponseSchema.safeParse({ data: { status: "ok" } }).success).toBe(true);
    expect(healthResponseSchema.safeParse({ data: { status: "down" } }).success).toBe(false);
    const entry = {
      id: "1",
      flagKey: "new-checkout",
      action: "created",
      before: null,
      after: false,
      actor: "anonymous",
      requestId: "req-1",
      at,
    };
    expect(auditEntrySchema.safeParse(entry).success).toBe(true);
    expect(auditEntrySchema.safeParse({ ...entry, action: "deleted" }).success).toBe(false);
    expect(auditEntrySchema.safeParse({ ...entry, before: "x" }).success).toBe(false);
    expect(auditResponseSchema.safeParse({ data: { entries: [entry] } }).success).toBe(true);
  });
});

describe("errorEnvelopeSchema", () => {
  it("parses an error with and without details", () => {
    const base = { code: "FLAG_EXISTS", message: "exists", requestId: "r1" };
    expect(errorEnvelopeSchema.safeParse({ error: base }).success).toBe(true);
    const withDetails = {
      error: { ...base, code: "VALIDATION_ERROR", details: [{ field: "key", message: "bad" }] },
    };
    expect(errorEnvelopeSchema.safeParse(withDetails).success).toBe(true);
  });

  it("rejects unknown codes and missing request id", () => {
    expect(errorEnvelopeSchema.safeParse({ error: { code: "NOPE", message: "m", requestId: "r" } }).success).toBe(false);
    expect(errorEnvelopeSchema.safeParse({ error: { code: "FLAG_EXISTS", message: "m" } }).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { ConfigError, createJsonLogger, parseConfig } from "../src/index";

describe("parseConfig", () => {
  it("uses the documented defaults", () => {
    expect(parseConfig({})).toEqual({ port: 3001, corsOrigin: "http://localhost:5173" });
  });

  it("reads a port and an origin", () => {
    expect(
      parseConfig({ FLAGS_API_PORT: "4010", FLAGS_CORS_ORIGIN: "https://flags.example.com" }),
    ).toEqual({ port: 4010, corsOrigin: "https://flags.example.com" });
  });

  it.each(["", "abc", "0", "65536", "-1", "30.5", "3001 ", "1e3", "0x10"])(
    "fails fast on port %j",
    (port) => {
      expect(() => parseConfig({ FLAGS_API_PORT: port })).toThrow(ConfigError);
      expect(() => parseConfig({ FLAGS_API_PORT: port })).toThrow(/FLAGS_API_PORT/);
    },
  );

  it.each([
    "*",
    "",
    "localhost:5173",
    "http://localhost:5173/",
    "http://localhost:5173/app",
    "http://a.example,http://b.example",
    "ftp://localhost:5173",
    "null",
  ])("fails fast on origin %j", (origin) => {
    expect(() => parseConfig({ FLAGS_CORS_ORIGIN: origin })).toThrow(/FLAGS_CORS_ORIGIN/);
  });
});

describe("createJsonLogger", () => {
  const now = () => new Date("2026-01-01T00:00:00.000Z");

  it("writes one JSON object with time, level and event", () => {
    const lines: string[] = [];
    const logger = createJsonLogger({ write: (l) => lines.push(l), now });
    logger.info("thing_happened", { count: 2 });
    logger.warn("thing_wrong");
    expect(lines.map((l) => JSON.parse(l) as unknown)).toEqual([
      { time: "2026-01-01T00:00:00.000Z", level: "info", count: 2, event: "thing_happened" },
      { time: "2026-01-01T00:00:00.000Z", level: "warn", event: "thing_wrong" },
    ]);
  });

  it("does not let call-site fields replace the event or the context", () => {
    const lines: string[] = [];
    const logger = createJsonLogger({
      write: (l) => lines.push(l),
      now,
      context: () => ({ requestId: "ctx-id" }),
    });
    logger.info("real_event", { event: "forged", requestId: "forged" });
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({ event: "real_event", requestId: "ctx-id" });
  });

  it("still writes a line with an event when fields cannot be serialized", () => {
    const lines: string[] = [];
    const logger = createJsonLogger({ write: (l) => lines.push(l), now });
    logger.info("big_number", { value: 10n });
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({ event: "big_number" });
  });
});

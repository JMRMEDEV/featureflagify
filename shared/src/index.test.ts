import { describe, expect, it } from "vitest";
import * as shared from "./index";

describe("shared entry point", () => {
  it.each([
    "flagKeySchema",
    "flagEnvName",
    "flagSchema",
    "auditEntrySchema",
    "createFlagBodySchema",
    "toggleFlagBodySchema",
    "listFlagsResponseSchema",
    "evaluateResponseSchema",
    "auditResponseSchema",
    "errorEnvelopeSchema",
  ])("exports %s", (name) => {
    expect(shared).toHaveProperty(name);
  });
});

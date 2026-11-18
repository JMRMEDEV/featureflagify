import { describe, expect, it } from "vitest";
import * as api from "../src/index.js";

describe("api workspace scaffold", () => {
  it("exposes no runtime exports yet", () => {
    expect(Object.keys(api)).toEqual([]);
  });
});

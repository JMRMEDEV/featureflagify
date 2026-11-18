import { describe, expect, it } from "vitest";
import { SHARED_PACKAGE_NAME } from "./index";

describe("shared entry", () => {
  it("exports the package name", () => {
    expect(SHARED_PACKAGE_NAME).toBe("@featureflagify/shared");
  });
});

import { describe, expect, it } from "vitest";
import { flagEnvName } from "./env-name";
import { flagKeySchema } from "./flag-key";

describe("flagEnvName", () => {
  it("maps new-checkout to VITE_FF_NEW_CHECKOUT", () => {
    expect(flagEnvName("new-checkout")).toBe("VITE_FF_NEW_CHECKOUT");
  });

  it("keeps digits and maps every hyphen", () => {
    expect(flagEnvName("checkout-v2")).toBe("VITE_FF_CHECKOUT_V2");
    expect(flagEnvName("a--b")).toBe("VITE_FF_A__B");
  });

  it("throws for an invalid key", () => {
    expect(() => flagEnvName("New_Checkout")).toThrow();
    expect(() => flagEnvName("")).toThrow();
  });

  it("is one-to-one over every valid key up to 4 characters", () => {
    const alphabet = "ab1-";
    const seen = new Map<string, string>();
    let valid = 0;
    const visit = (prefix: string, length: number): void => {
      if (prefix.length > 0 && flagKeySchema.safeParse(prefix).success) {
        valid += 1;
        const name = flagEnvName(prefix);
        expect(seen.get(name)).toBeUndefined();
        seen.set(name, prefix);
      }
      if (prefix.length === length) return;
      for (const ch of alphabet) visit(prefix + ch, length);
    };
    visit("", 4);
    expect(valid).toBeGreaterThan(50);
    expect(seen.size).toBe(valid);
  });

  it("can be reversed to the original key", () => {
    for (const key of ["new-checkout", "a--b", "x1-y2-z3"]) {
      const back = flagEnvName(key)
        .slice("VITE_FF_".length)
        .replaceAll("_", "-")
        .toLowerCase();
      expect(back).toBe(key);
    }
  });
});

import { describe, expect, it } from "vitest";
import { flagKeySchema } from "./flag-key";

const accepted = [
  "ab",
  "new-checkout",
  "a1",
  "a-b",
  "a--b",
  "checkout-v2",
  `a${"b".repeat(63)}`, // 64 characters
];

const rejected: ReadonlyArray<readonly [string, string]> = [
  ["", "empty"],
  ["a", "one character"],
  [`a${"b".repeat(64)}`, "too long (65)"],
  ["New-Checkout", "uppercase"],
  ["1checkout", "leading digit"],
  ["-checkout", "leading hyphen"],
  ["checkout-", "trailing hyphen"],
  ["new_checkout", "underscore"],
  ["checkout_", "trailing underscore"],
  ["new checkout", "space"],
  ["new.checkout", "dot"],
  ["checkout\n", "trailing newline"],
  ["café-flag", "non-ascii"],
];

describe("flagKeySchema", () => {
  it.each(accepted)("accepts %s", (key) => {
    expect(flagKeySchema.safeParse(key).success).toBe(true);
  });

  it("accepts the 64 character maximum and rejects 65", () => {
    expect(`a${"b".repeat(63)}`).toHaveLength(64);
    expect(flagKeySchema.safeParse(`a${"b".repeat(63)}`).success).toBe(true);
    expect(flagKeySchema.safeParse(`a${"b".repeat(64)}`).success).toBe(false);
  });

  it.each(rejected)("rejects %j (%s)", (key) => {
    expect(flagKeySchema.safeParse(key).success).toBe(false);
  });

  it("rejects non-strings", () => {
    for (const value of [null, undefined, 1, true, {}, []]) {
      expect(flagKeySchema.safeParse(value).success).toBe(false);
    }
  });
});

import { z } from "zod";

/** Lowercase kebab-case, 2-64 characters, starts with a letter, ends with a letter or digit. */
export const FLAG_KEY_PATTERN = /^[a-z][a-z0-9-]{0,62}[a-z0-9]$/;

export const flagKeySchema = z.string().regex(FLAG_KEY_PATTERN, {
  error: "Flag key must be lowercase kebab-case, 2-64 characters",
});

export type FlagKey = z.infer<typeof flagKeySchema>;

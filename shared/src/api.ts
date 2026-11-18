import { z } from "zod";
import {
  auditEntrySchema,
  flagDescriptionSchema,
  flagNameSchema,
  flagSchema,
} from "./flag";
import { flagKeySchema } from "./flag-key";

// Request bodies. Strict: unknown fields are rejected.

/** POST /flags. `name` defaults to the key in the service, not here. */
export const createFlagBodySchema = z.strictObject({
  key: flagKeySchema,
  name: flagNameSchema.optional(),
  description: flagDescriptionSchema.optional(),
  enabled: z.boolean().optional(),
});
export type CreateFlagBody = z.infer<typeof createFlagBodySchema>;

/** PATCH /flags/:key. Disabling is the only off-switch (D8). */
export const toggleFlagBodySchema = z.strictObject({
  enabled: z.boolean(),
});
export type ToggleFlagBody = z.infer<typeof toggleFlagBodySchema>;

/** GET /audit query string. */
export const auditQuerySchema = z.strictObject({
  flag: flagKeySchema.optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

// Success responses. Every success body is wrapped as { data }.

export const listFlagsResponseSchema = z.object({
  data: z.object({ flags: z.array(flagSchema) }),
});
export type ListFlagsResponse = z.infer<typeof listFlagsResponseSchema>;

export const flagResponseSchema = z.object({
  data: z.object({ flag: flagSchema }),
});
export type FlagResponse = z.infer<typeof flagResponseSchema>;

/** Keys are dynamic (D2), so values are a plain record of booleans. */
export const evaluateResponseSchema = z.object({
  data: z.object({ flags: z.record(z.string(), z.boolean()) }),
});
export type EvaluateResponse = z.infer<typeof evaluateResponseSchema>;
export type FlagValues = EvaluateResponse["data"]["flags"];

export const auditResponseSchema = z.object({
  data: z.object({ entries: z.array(auditEntrySchema) }),
});
export type AuditResponse = z.infer<typeof auditResponseSchema>;

export const healthResponseSchema = z.object({
  data: z.object({ status: z.literal("ok") }),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

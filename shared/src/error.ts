import { z } from "zod";

export const errorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "FLAG_EXISTS",
  "FLAG_NOT_FOUND",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** One failing field. CONTRACTS.md says only that `details` lists the failing fields. */
export const errorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
});
export type ErrorDetail = z.infer<typeof errorDetailSchema>;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    requestId: z.string(),
    details: z.array(errorDetailSchema).optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

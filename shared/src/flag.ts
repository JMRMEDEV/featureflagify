import { z } from "zod";
import { flagKeySchema } from "./flag-key";

const isoTimestampSchema = z.iso.datetime();

export const flagNameSchema = z.string().min(1).max(100);
export const flagDescriptionSchema = z.string().max(500);

export const flagSchema = z.object({
  key: flagKeySchema,
  name: flagNameSchema,
  description: flagDescriptionSchema,
  enabled: z.boolean(),
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
});

export type Flag = z.infer<typeof flagSchema>;

export const auditActionSchema = z.enum(["created", "enabled", "disabled"]);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditEntrySchema = z.object({
  id: z.string().min(1),
  flagKey: flagKeySchema,
  action: auditActionSchema,
  before: z.boolean().nullable(),
  after: z.boolean(),
  actor: z.string().min(1).max(100),
  requestId: z.string().min(1),
  at: isoTimestampSchema,
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;

import type { ErrorCode, ErrorDetail, ErrorEnvelope } from "@featureflagify/shared";
import type { z } from "zod";
import { FlagExistsError, FlagNotFoundError } from "../errors";

/** Thrown by route handlers when a request fails schema validation. */
export class RequestValidationError extends Error {
  readonly details: readonly ErrorDetail[];

  constructor(details: readonly ErrorDetail[]) {
    super("Request validation failed");
    this.name = "RequestValidationError";
    this.details = details;
  }
}

export type ParseOutcome<T> =
  | { success: true; data: T }
  | { success: false; details: ErrorDetail[] };

/**
 * Parses untrusted input with a shared schema. `root` names the field when the
 * failure is on the whole value (for example a body that is not an object).
 */
export function parseInput<T>(schema: z.ZodType<T>, input: unknown, root: string): ParseOutcome<T> {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const details: ErrorDetail[] = [];
  for (const issue of result.error.issues) {
    const path = issue.path.map(String);
    if (issue.code === "unrecognized_keys") {
      for (const key of issue.keys) {
        details.push({ field: [...path, key].join("."), message: "Unknown field" });
      }
    } else {
      details.push({ field: (path.length > 0 ? path : [root]).join("."), message: issue.message });
    }
  }
  return { success: false, details };
}

export interface MappedError {
  status: number;
  code: ErrorCode;
  message: string;
  details?: readonly ErrorDetail[];
  /** True when the error was not one the contract describes. The caller logs it. */
  unexpected: boolean;
}

const GENERIC_INTERNAL_MESSAGE = "Something went wrong";

function isFrameworkClientError(error: unknown): error is { statusCode: number; code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "code" in error &&
    typeof error.statusCode === "number" &&
    typeof error.code === "string" &&
    error.statusCode >= 400 &&
    error.statusCode < 500 &&
    error.code.startsWith("FST_ERR_")
  );
}

/**
 * Maps any thrown value to the contract's error shape. Messages are fixed text, so
 * nothing from the thrown error reaches the client except for domain errors, whose
 * messages are part of the contract.
 */
export function mapError(error: unknown): MappedError {
  if (error instanceof RequestValidationError) {
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: error.details,
      unexpected: false,
    };
  }
  if (error instanceof FlagExistsError) {
    return { status: 409, code: "FLAG_EXISTS", message: error.message, unexpected: false };
  }
  if (error instanceof FlagNotFoundError) {
    return { status: 404, code: "FLAG_NOT_FOUND", message: error.message, unexpected: false };
  }
  if (isFrameworkClientError(error)) {
    // Malformed JSON, empty or oversized body, wrong content type, bad URL encoding.
    const field = error.code.startsWith("FST_ERR_CTP_") ? "body" : "request";
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: [
        {
          field,
          message:
            field === "body"
              ? "The request body is not valid JSON or is not accepted"
              : "The request could not be read",
        },
      ],
      unexpected: false,
    };
  }
  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: GENERIC_INTERNAL_MESSAGE,
    unexpected: true,
  };
}

export function toEnvelope(mapped: MappedError, requestId: string): ErrorEnvelope {
  return {
    error: {
      code: mapped.code,
      message: mapped.message,
      requestId,
      ...(mapped.details === undefined ? {} : { details: [...mapped.details] }),
    },
  };
}

/** The 404 for a route the contract does not define. See api/README.md. */
export function routeNotFound(requestId: string): ErrorEnvelope {
  return toEnvelope(
    { status: 404, code: "FLAG_NOT_FOUND", message: "Route not found", unexpected: false },
    requestId,
  );
}

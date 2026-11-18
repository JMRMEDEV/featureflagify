import cors from "@fastify/cors";
import {
  auditEntrySchema,
  auditQuerySchema,
  createFlagBodySchema,
  flagKeySchema,
  toggleFlagBodySchema,
  type AuditResponse,
  type ErrorDetail,
  type EvaluateResponse,
  type FlagResponse,
  type HealthResponse,
  type ListFlagsResponse,
} from "@featureflagify/shared";
import Fastify, { type FastifyInstance } from "fastify";
import type { AuditLog } from "../audit-log";
import type { FlagService } from "../flag-service";
import type { Logger } from "../logger";
import {
  mapError,
  parseInput,
  RequestValidationError,
  routeNotFound,
  toEnvelope,
  type ParseOutcome,
} from "./errors";
import { runWithRequestId } from "./request-context";

export interface AppDeps {
  service: FlagService;
  auditLog: AuditLog;
  /**
   * Must be built with `currentRequestFields` as its context so that the service's
   * own lines carry the request id too.
   */
  logger: Logger;
  /** Generates a request id when the client sends none or an invalid one. */
  newRequestId: () => string;
  /** The one origin allowed by CORS. */
  corsOrigin: string;
}

/** 1-128 printable ASCII characters, space included. */
const REQUEST_ID_PATTERN = /^[\x20-\x7e]{1,128}$/;

/** The audit entry's own actor rule (1-100 characters), so the two cannot drift. */
const actorSchema = auditEntrySchema.shape.actor;

/** Request body limit in bytes. Flag bodies are a few hundred bytes. */
const BODY_LIMIT_BYTES = 16 * 1024;

function failures(...outcomes: ParseOutcome<unknown>[]): ErrorDetail[] {
  return outcomes.flatMap((outcome) => (outcome.success ? [] : outcome.details));
}

function readActor(header: unknown): ParseOutcome<string | undefined> {
  if (header === undefined) {
    return { success: true, data: undefined };
  }
  return parseInput(actorSchema, header, "x-actor");
}

function readKeyParam(params: unknown): ParseOutcome<string> {
  const raw = typeof params === "object" && params !== null && "key" in params ? params.key : undefined;
  return parseInput(flagKeySchema, raw, "key");
}

/** Builds the HTTP adapter. It translates HTTP to service calls and holds no flag rules. */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { service, auditLog, logger } = deps;

  const app = Fastify({
    // Fastify's own logger is off: its lines are pino JSON with a different shape and
    // no `event` field. Every line comes from the shared JSON logger instead.
    logger: false,
    requestIdHeader: false,
    genReqId: (req) => {
      const header = req.headers["x-request-id"];
      return typeof header === "string" && REQUEST_ID_PATTERN.test(header)
        ? header
        : deps.newRequestId();
    },
    bodyLimit: BODY_LIMIT_BYTES,
  });

  app.addHook("onRequest", (request, _reply, done) => {
    runWithRequestId(request.id, done);
  });

  app.addHook("onSend", (request, reply, payload, done) => {
    reply.header("x-request-id", request.id);
    done(null, payload);
  });

  app.addHook("onResponse", (request, reply, done) => {
    logger.info("request_completed", {
      method: request.method,
      path: request.url.split("?")[0],
      status: reply.statusCode,
      requestId: request.id,
    });
    done();
  });

  await app.register(cors, {
    origin: [deps.corsOrigin],
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["content-type", "x-request-id", "x-actor"],
    exposedHeaders: ["x-request-id"],
    strictPreflight: false,
  });

  app.setErrorHandler((error: unknown, request, reply) => {
    const mapped = mapError(error);
    if (mapped.unexpected) {
      // Detail goes to the log only. The response body stays generic.
      logger.warn("request_failed", {
        requestId: request.id,
        errorName: error instanceof Error ? error.name : "NonError",
        errorMessage: error instanceof Error ? error.message : "non-error value thrown",
      });
    }
    return reply.status(mapped.status).send(toEnvelope(mapped, request.id));
  });

  app.setNotFoundHandler((request, reply) => reply.status(404).send(routeNotFound(request.id)));

  app.get("/health", (): HealthResponse => ({ data: { status: "ok" } }));

  app.get("/flags", async (): Promise<ListFlagsResponse> => {
    return { data: { flags: await service.list() } };
  });

  app.post("/flags", async (request, reply): Promise<FlagResponse> => {
    const body = parseInput(createFlagBodySchema, request.body, "body");
    const actor = readActor(request.headers["x-actor"]);
    if (!body.success || !actor.success) {
      throw new RequestValidationError(failures(body, actor));
    }
    const flag = await service.create(body.data, {
      actor: actor.data,
      requestId: request.id,
    });
    reply.status(201);
    return { data: { flag } };
  });

  app.patch("/flags/:key", async (request): Promise<FlagResponse> => {
    const key = readKeyParam(request.params);
    const body = parseInput(toggleFlagBodySchema, request.body, "body");
    const actor = readActor(request.headers["x-actor"]);
    if (!key.success || !body.success || !actor.success) {
      throw new RequestValidationError(failures(key, body, actor));
    }
    const result = await service.toggle(key.data, body.data.enabled, {
      actor: actor.data,
      requestId: request.id,
    });
    return { data: { flag: result.flag } };
  });

  app.get("/evaluate", async (): Promise<EvaluateResponse> => {
    return { data: { flags: await service.evaluate() } };
  });

  app.get("/audit", async (request): Promise<AuditResponse> => {
    const query = parseInput(auditQuerySchema, request.query, "query");
    if (!query.success) {
      throw new RequestValidationError(query.details);
    }
    return { data: { entries: await auditLog.list(query.data.flag) } };
  });

  return app;
}

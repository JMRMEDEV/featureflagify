import { randomUUID } from "node:crypto";
import { ConfigError, parseConfig, type ApiConfig } from "./config";
import { buildApp } from "./http/app";
import { currentRequestFields } from "./http/request-context";
import { InMemoryAuditLog } from "./in-memory-audit-log";
import { InMemoryFlagRepository } from "./in-memory-flag-repository";
import { createJsonLogger } from "./json-logger";
import { FlagService } from "./flag-service";

/**
 * Composition root. To use another repository, replace `InMemoryFlagRepository`
 * and `InMemoryAuditLog` here. See api/README.md.
 */
async function main(): Promise<void> {
  const logger = createJsonLogger({
    write: (line) => process.stdout.write(`${line}\n`),
    now: () => new Date(),
    context: currentRequestFields,
  });

  let config: ApiConfig;
  try {
    config = parseConfig(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.warn("config_invalid", { message: error.message });
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  const auditLog = new InMemoryAuditLog();
  const service = new FlagService({
    repository: new InMemoryFlagRepository(),
    auditLog,
    logger,
    now: () => new Date(),
    newId: randomUUID,
  });
  const app = await buildApp({
    service,
    auditLog,
    logger,
    newRequestId: randomUUID,
    corsOrigin: config.corsOrigin,
  });

  const shutdown = (signal: string): void => {
    logger.info("server_stopping", { signal });
    void app.close();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  await app.listen({ host: "127.0.0.1", port: config.port });
  logger.info("server_started", {
    host: "127.0.0.1",
    port: config.port,
    corsOrigin: config.corsOrigin,
  });
}

main().catch((error: unknown) => {
  process.stdout.write(
    `${JSON.stringify({
      time: new Date().toISOString(),
      level: "warn",
      event: "server_failed",
      errorName: error instanceof Error ? error.name : "NonError",
      errorMessage: error instanceof Error ? error.message : "non-error value thrown",
    })}\n`,
  );
  process.exitCode = 1;
});

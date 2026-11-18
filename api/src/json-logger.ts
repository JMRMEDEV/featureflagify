import type { LogFields, Logger } from "./logger";

export interface JsonLoggerOptions {
  /** Receives one JSON document per call, without a trailing newline. */
  write: (line: string) => void;
  now: () => Date;
  /** Fields added to every line, for example the current request id. */
  context?: () => LogFields;
}

/**
 * The one Logger implementation. Every line is a JSON object with `time`, `level`
 * and `event`. Context and `event` are written last so call-site fields cannot
 * replace them.
 */
export function createJsonLogger(options: JsonLoggerOptions): Logger {
  const emit = (level: "info" | "warn", event: string, fields: LogFields | undefined): void => {
    const time = options.now().toISOString();
    try {
      options.write(
        JSON.stringify({ time, level, ...fields, ...options.context?.(), event }),
      );
    } catch {
      // Fields that cannot be serialized must not fail the request being logged.
      options.write(JSON.stringify({ time, level, event, logError: "unserializable_fields" }));
    }
  };
  return {
    info: (event, fields) => emit("info", event, fields),
    warn: (event, fields) => emit("warn", event, fields),
  };
}

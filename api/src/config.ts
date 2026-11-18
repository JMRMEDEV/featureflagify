export interface ApiConfig {
  port: number;
  corsOrigin: string;
}

/** Thrown for an env value that is set but unusable. The message names the variable. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const DEFAULT_PORT = 3001;
const DEFAULT_CORS_ORIGIN = "http://localhost:5173";

function parsePort(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_PORT;
  }
  const port = /^\d{1,5}$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError("FLAGS_API_PORT must be an integer from 1 to 65535");
  }
  return port;
}

function parseCorsOrigin(raw: string | undefined): string {
  if (raw === undefined) {
    return DEFAULT_CORS_ORIGIN;
  }
  const problem = "FLAGS_CORS_ORIGIN must be one exact http(s) origin such as http://localhost:5173";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError(problem);
  }
  // `origin` drops any path, query and trailing slash, so equality means the value
  // is a bare origin. A wildcard or a list never parses as a URL.
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.origin !== raw) {
    throw new ConfigError(problem);
  }
  return raw;
}

/** Reads the API settings. A set but invalid value fails fast instead of falling back. */
export function parseConfig(env: Readonly<Record<string, string | undefined>>): ApiConfig {
  return {
    port: parsePort(env["FLAGS_API_PORT"]),
    corsOrigin: parseCorsOrigin(env["FLAGS_CORS_ORIGIN"]),
  };
}

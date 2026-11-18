import type { FlagEnv } from './resolver';

export const DEFAULT_TIMEOUT_MS = 2000;

/** The part of `fetch` the provider uses. The global `fetch` satisfies it. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** Everything the provider needs, injected so tests need no module mocks. */
export type FlagProviderConfig = {
  /** Base URL of the flag API. Missing or blank means the API is unavailable. */
  readonly baseUrl: string | undefined;
  readonly timeoutMs: number;
  readonly env: FlagEnv;
  readonly fetch: FetchLike;
};

/** Parses a timeout. Only positive whole numbers are accepted, else the default. */
export function parseTimeoutMs(raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/.test(raw.trim())) return DEFAULT_TIMEOUT_MS;
  const parsed = Number(raw.trim());
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

/**
 * Builds the provider config from an env object. Production passes `import.meta.env`
 * whole, so the resolver can look up `VITE_FF_<KEY>` dynamically.
 */
export function flagConfigFromEnv(env: FlagEnv, fetchFn: FetchLike): FlagProviderConfig {
  return {
    baseUrl: env['VITE_FLAGS_API_URL'],
    timeoutMs: parseTimeoutMs(env['VITE_FLAGS_TIMEOUT_MS']),
    env,
    fetch: fetchFn,
  };
}

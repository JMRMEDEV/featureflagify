import {
  createFlagBodySchema,
  errorEnvelopeSchema,
  flagResponseSchema,
  listFlagsResponseSchema,
  toggleFlagBodySchema,
  type CreateFlagBody,
  type ErrorCode,
  type ErrorDetail,
  type Flag,
} from '@featureflagify/shared';
import { DEFAULT_TIMEOUT_MS, type FetchLike } from '../flags/config';

/** Why a management call failed. The client never throws. */
export type ManagementError =
  /** Network failure, timeout or abort. */
  | { readonly kind: 'network' }
  /** The API answered with its error envelope. */
  | {
      readonly kind: 'api';
      readonly status: number;
      readonly code: ErrorCode;
      readonly message: string;
      readonly details: readonly ErrorDetail[];
    }
  /** A non-2xx answer that is not the error envelope. */
  | { readonly kind: 'http'; readonly status: number }
  /** A 2xx answer whose body is not valid JSON or fails the shared schema. */
  | { readonly kind: 'invalid-response'; readonly status: number }
  /** The request body failed the shared schema, so nothing was sent. */
  | { readonly kind: 'invalid-request' }
  /** No API base URL is configured. */
  | { readonly kind: 'not-configured' };

export type ManagementResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ManagementError };

export type ManagementClient = {
  listFlags: () => Promise<ManagementResult<readonly Flag[]>>;
  createFlag: (body: CreateFlagBody) => Promise<ManagementResult<Flag>>;
  setFlagEnabled: (key: string, enabled: boolean) => Promise<ManagementResult<Flag>>;
};

export type ManagementClientConfig = {
  readonly baseUrl: string | undefined;
  readonly fetch: FetchLike;
  readonly timeoutMs?: number;
};

type Outcome = { readonly status: number; readonly ok: boolean; readonly body: unknown };

/**
 * One request with a timeout. Same approach as the provider: the abort rejects a race,
 * so a fetch that ignores the signal still ends at the timeout. Resolves with
 * `undefined` on any network failure. A body that is not JSON becomes `undefined`.
 */
async function send(
  url: string,
  init: RequestInit,
  fetchFn: FetchLike,
  timeoutMs: number,
): Promise<Outcome | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const aborted = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener('abort', () => reject(new Error('Request aborted')), {
      once: true,
    });
  });
  const work = (async (): Promise<Outcome> => {
    const response = await fetchFn(url, { ...init, signal: controller.signal });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    return { status: response.status, ok: response.ok, body };
  })();
  try {
    return await Promise.race([work, aborted]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function toError(outcome: Outcome | undefined): ManagementError | undefined {
  if (outcome === undefined) return { kind: 'network' };
  if (outcome.ok) return undefined;
  const envelope = errorEnvelopeSchema.safeParse(outcome.body);
  if (!envelope.success) return { kind: 'http', status: outcome.status };
  const { code, message, details } = envelope.data.error;
  return { kind: 'api', status: outcome.status, code, message, details: details ?? [] };
}

/**
 * Typed client for the management endpoints. Fetch and base URL are injected.
 * Every response is parsed with the shared schemas. Management data is separate
 * from evaluate data, so nothing here touches the flag provider.
 */
export function createManagementClient(config: ManagementClientConfig): ManagementClient {
  const base = config.baseUrl?.trim().replace(/\/+$/, '');
  const timeoutMs =
    config.timeoutMs !== undefined && Number.isFinite(config.timeoutMs) && config.timeoutMs > 0
      ? config.timeoutMs
      : DEFAULT_TIMEOUT_MS;

  async function call<T>(
    path: string,
    method: 'GET' | 'POST' | 'PATCH',
    body: unknown,
    parse: (raw: unknown) => T | undefined,
  ): Promise<ManagementResult<T>> {
    if (base === undefined || base === '') return { ok: false, error: { kind: 'not-configured' } };
    const headers: Record<string, string> = { accept: 'application/json' };
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const outcome = await send(`${base}${path}`, init, config.fetch, timeoutMs);
    const failure = toError(outcome);
    if (failure !== undefined) return { ok: false, error: failure };
    if (outcome === undefined) return { ok: false, error: { kind: 'network' } };
    const data = parse(outcome.body);
    if (data === undefined) {
      return { ok: false, error: { kind: 'invalid-response', status: outcome.status } };
    }
    return { ok: true, data };
  }

  const parseList = (raw: unknown): readonly Flag[] | undefined => {
    const parsed = listFlagsResponseSchema.safeParse(raw);
    return parsed.success ? parsed.data.data.flags : undefined;
  };
  const parseFlag = (raw: unknown): Flag | undefined => {
    const parsed = flagResponseSchema.safeParse(raw);
    return parsed.success ? parsed.data.data.flag : undefined;
  };

  return {
    listFlags: () => call('/flags', 'GET', undefined, parseList),
    async createFlag(body) {
      const checked = createFlagBodySchema.safeParse(body);
      if (!checked.success) return { ok: false, error: { kind: 'invalid-request' } };
      return call('/flags', 'POST', checked.data, parseFlag);
    },
    async setFlagEnabled(key, enabled) {
      const checked = toggleFlagBodySchema.safeParse({ enabled });
      if (!checked.success) return { ok: false, error: { kind: 'invalid-request' } };
      return call(`/flags/${encodeURIComponent(key)}`, 'PATCH', checked.data, parseFlag);
    },
  };
}

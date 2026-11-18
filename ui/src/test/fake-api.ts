import type { Flag } from '@featureflagify/shared';
import type { FetchLike } from '../flags';

export const BASE_URL = 'http://flags.test';

export type RecordedRequest = {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly signal: AbortSignal | null | undefined;
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function makeFlag(key: string, overrides: Partial<Flag> = {}): Flag {
  return {
    key,
    name: key,
    description: '',
    enabled: false,
    createdAt: '2026-11-18T10:00:00.000Z',
    updatedAt: '2026-11-18T16:15:00.000Z',
    ...overrides,
  };
}

export function listBody(flags: readonly Flag[]): unknown {
  return { data: { flags } };
}

export function flagBody(flag: Flag): unknown {
  return { data: { flag } };
}

export function errorBody(
  code: string,
  message: string,
  details?: ReadonlyArray<{ field: string; message: string }>,
): unknown {
  return {
    error: { code, message, requestId: 'req-1', ...(details === undefined ? {} : { details }) },
  };
}

export type Deferred<T> = {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: Error) => void;
};

export function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function readHeaders(init: RequestInit): Record<string, string> {
  const result: Record<string, string> = {};
  new Headers(init.headers).forEach((value, name) => {
    result[name] = value;
  });
  return result;
}

function readBody(init: RequestInit): unknown {
  return typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
}

export type Responder = (request: RecordedRequest) => Response | Promise<Response>;

/** A fetch driven by one responder. It records every request and never touches the network. */
export function fakeFetch(responder: Responder): { fetch: FetchLike; requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  const fetch: FetchLike = async (url, init) => {
    const request: RecordedRequest = {
      url,
      method: init.method ?? 'GET',
      headers: readHeaders(init),
      body: readBody(init),
      signal: init.signal,
    };
    requests.push(request);
    return responder(request);
  };
  return { fetch, requests };
}

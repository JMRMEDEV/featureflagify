import { describe, expect, it } from 'vitest';
import { createManagementClient } from './management-client';
import {
  BASE_URL,
  errorBody,
  fakeFetch,
  flagBody,
  json,
  listBody,
  makeFlag,
  type Responder,
} from '../test/fake-api';

function setup(responder: Responder, baseUrl: string | undefined = BASE_URL, timeoutMs = 2000) {
  const api = fakeFetch(responder);
  const client = createManagementClient({ baseUrl, fetch: api.fetch, timeoutMs });
  return { client, requests: api.requests };
}

describe('management client: success', () => {
  it('lists flags with GET /flags and parses them', async () => {
    const flag = makeFlag('new-checkout', { enabled: true });
    const { client, requests } = setup(() => json(listBody([flag])));
    const result = await client.listFlags();
    expect(result).toEqual({ ok: true, data: [flag] });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(`${BASE_URL}/flags`);
    expect(requests[0]?.method).toBe('GET');
    expect(requests[0]?.headers['accept']).toBe('application/json');
    expect(requests[0]?.headers['x-actor']).toBeUndefined();
  });

  it('ignores a trailing slash in the base URL', async () => {
    const { client, requests } = setup(() => json(listBody([])), `${BASE_URL}//`);
    await client.listFlags();
    expect(requests[0]?.url).toBe(`${BASE_URL}/flags`);
  });

  it('creates a flag with a JSON POST body', async () => {
    const flag = makeFlag('dark-banner', { name: 'Dark', description: 'd' });
    const { client, requests } = setup(() => json(flagBody(flag), 201));
    const result = await client.createFlag({ key: 'dark-banner', name: 'Dark', description: 'd' });
    expect(result).toEqual({ ok: true, data: flag });
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url).toBe(`${BASE_URL}/flags`);
    expect(requests[0]?.headers['content-type']).toBe('application/json');
    expect(requests[0]?.body).toEqual({ key: 'dark-banner', name: 'Dark', description: 'd' });
  });

  it('toggles with PATCH /flags/:key and an enabled body', async () => {
    const flag = makeFlag('new-checkout', { enabled: true });
    const { client, requests } = setup(() => json(flagBody(flag)));
    const result = await client.setFlagEnabled('new-checkout', true);
    expect(result).toEqual({ ok: true, data: flag });
    expect(requests[0]?.method).toBe('PATCH');
    expect(requests[0]?.url).toBe(`${BASE_URL}/flags/new-checkout`);
    expect(requests[0]?.headers['content-type']).toBe('application/json');
    expect(requests[0]?.body).toEqual({ enabled: true });
  });

  it('encodes the key in the PATCH path', async () => {
    const { client, requests } = setup(() => json(flagBody(makeFlag('ab'))));
    await client.setFlagEnabled('a/../b', false);
    expect(requests[0]?.url).toBe(`${BASE_URL}/flags/a%2F..%2Fb`);
  });
});

describe('management client: failures', () => {
  it('returns the parsed envelope for 409 FLAG_EXISTS', async () => {
    const { client } = setup(() =>
      json(errorBody('FLAG_EXISTS', 'A flag with this key already exists'), 409),
    );
    const result = await client.createFlag({ key: 'new-checkout' });
    expect(result).toEqual({
      ok: false,
      error: {
        kind: 'api',
        status: 409,
        code: 'FLAG_EXISTS',
        message: 'A flag with this key already exists',
        details: [],
      },
    });
  });

  it('returns details for 400 VALIDATION_ERROR', async () => {
    const details = [{ field: 'name', message: 'Too long' }];
    const { client } = setup(() => json(errorBody('VALIDATION_ERROR', 'Invalid', details), 400));
    const result = await client.createFlag({ key: 'new-checkout' });
    expect(result).toEqual({
      ok: false,
      error: { kind: 'api', status: 400, code: 'VALIDATION_ERROR', message: 'Invalid', details },
    });
  });

  it('returns INTERNAL_ERROR for a 500 envelope', async () => {
    const { client } = setup(() => json(errorBody('INTERNAL_ERROR', 'Internal error'), 500));
    const result = await client.setFlagEnabled('new-checkout', true);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ kind: 'api', status: 500, code: 'INTERNAL_ERROR' });
    }
  });

  it('returns kind http for a non-2xx answer that is not the envelope', async () => {
    const { client } = setup(() => new Response('<html>bad gateway</html>', { status: 502 }));
    expect(await client.listFlags()).toEqual({ ok: false, error: { kind: 'http', status: 502 } });
  });

  it('returns invalid-response when a 2xx body fails the shared schema', async () => {
    const { client } = setup(() => json({ data: { flags: [{ key: 'Bad Key' }] } }));
    expect(await client.listFlags()).toEqual({
      ok: false,
      error: { kind: 'invalid-response', status: 200 },
    });
  });

  it('returns invalid-response when a 2xx body is not JSON', async () => {
    const { client } = setup(() => new Response('not json', { status: 200 }));
    expect(await client.setFlagEnabled('new-checkout', true)).toEqual({
      ok: false,
      error: { kind: 'invalid-response', status: 200 },
    });
  });

  it('returns network when fetch rejects', async () => {
    const { client } = setup(() => Promise.reject(new TypeError('Failed to fetch')));
    expect(await client.listFlags()).toEqual({ ok: false, error: { kind: 'network' } });
  });

  it('returns network when the request times out, and aborts the signal', async () => {
    const { client, requests } = setup(() => new Promise<Response>(() => undefined), BASE_URL, 10);
    expect(await client.listFlags()).toEqual({ ok: false, error: { kind: 'network' } });
    expect(requests[0]?.signal?.aborted).toBe(true);
  });

  it('returns not-configured and sends nothing without a base URL', async () => {
    const api = fakeFetch(() => json(listBody([])));
    const client = createManagementClient({ baseUrl: undefined, fetch: api.fetch });
    const requests = api.requests;
    expect(await client.listFlags()).toEqual({ ok: false, error: { kind: 'not-configured' } });
    expect(requests).toHaveLength(0);
  });

  it('returns invalid-request and sends nothing for an invalid create body', async () => {
    const { client, requests } = setup(() => json(flagBody(makeFlag('ab')), 201));
    expect(await client.createFlag({ key: 'Not Valid' })).toEqual({
      ok: false,
      error: { kind: 'invalid-request' },
    });
    expect(requests).toHaveLength(0);
  });
});

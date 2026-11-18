import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flagConfigFromEnv, parseTimeoutMs, type FetchLike, type FlagProviderConfig } from './config';
import { createFlagKit } from './provider';
import { defineFlags } from './registry';

const registry = defineFlags({ 'new-checkout': false, 'dark-mode': true, beta: false });
const { FlagProvider, useFlag, useFlagState } = createFlagKit(registry);

type Call = { url: string; signal: AbortSignal | null | undefined };

type Deferred = {
  promise: Promise<Response>;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
};

function deferred(): Deferred {
  let resolve: Deferred['resolve'] = () => undefined;
  let reject: Deferred['reject'] = () => undefined;
  const promise = new Promise<Response>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function evaluateBody(flags: Record<string, boolean>): unknown {
  return { data: { flags } };
}

/** A fetch whose responses are queued; it records every call. Rejects on abort like the real one. */
function fakeFetch(...responders: Array<() => Promise<Response>>): {
  fetch: FetchLike;
  calls: Call[];
} {
  const calls: Call[] = [];
  const queue = [...responders];
  const fetch: FetchLike = (url, init) => {
    calls.push({ url, signal: init.signal });
    const next = queue.shift();
    if (next === undefined) return Promise.reject(new Error('No response queued'));
    const response = next();
    const signal = init.signal;
    if (signal === null || signal === undefined) return response;
    return new Promise<Response>((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
        once: true,
      });
      response.then(resolve, reject);
    });
  };
  return { fetch, calls };
}

function config(fetchFn: FetchLike, overrides: Partial<FlagProviderConfig> = {}): FlagProviderConfig {
  return {
    baseUrl: 'http://flags.test',
    timeoutMs: 2000,
    env: { VITE_FF_DARK_MODE: 'false' },
    fetch: fetchFn,
    ...overrides,
  };
}

function Probe() {
  const { state, refresh } = useFlagState();
  const checkout = useFlag('new-checkout');
  const dark = useFlag('dark-mode');
  const beta = useFlag('beta');
  return (
    <div>
      <p role="status">{`state: ${state}`}</p>
      <ul>
        <li>{`new-checkout: ${String(checkout.value)} (${checkout.source})`}</li>
        <li>{`dark-mode: ${String(dark.value)} (${dark.source})`}</li>
        <li>{`beta: ${String(beta.value)} (${beta.source})`}</li>
      </ul>
      <button type="button" onClick={() => void refresh()}>
        Refresh
      </button>
    </div>
  );
}

function renderProbe(cfg: FlagProviderConfig) {
  return render(
    <FlagProvider config={cfg}>
      <Probe />
    </FlagProvider>,
  );
}

async function expectState(state: string): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole('status').textContent).toBe(`state: ${state}`);
  });
}

function expectFallbackValues(): void {
  expect(screen.getByText('new-checkout: false (default)')).toBeTruthy();
  expect(screen.getByText('dark-mode: false (env)')).toBeTruthy();
  expect(screen.getByText('beta: false (default)')).toBeTruthy();
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('FlagProvider', () => {
  it('renders the first frame from env and defaults without waiting for the fetch', () => {
    const pending = deferred();
    const { fetch, calls } = fakeFetch(() => pending.promise);
    renderProbe(config(fetch));

    expect(screen.getByRole('status').textContent).toBe('state: loading');
    expectFallbackValues();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('http://flags.test/evaluate');
  });

  it('replaces fallback values with API values and sets ok', async () => {
    const { fetch } = fakeFetch(() =>
      Promise.resolve(json(evaluateBody({ 'new-checkout': true, 'dark-mode': true }))),
    );
    renderProbe(config(fetch));

    await expectState('ok');
    expect(screen.getByText('new-checkout: true (api)')).toBeTruthy();
    expect(screen.getByText('dark-mode: true (api)')).toBeTruthy();
    expect(screen.getByText('beta: false (default)')).toBeTruthy();
  });

  it('ignores undeclared API keys and lets absent declared keys fall through', async () => {
    const { fetch } = fakeFetch(() =>
      Promise.resolve(json(evaluateBody({ 'new-checkout': true, 'not-declared': true }))),
    );
    renderProbe(config(fetch));

    await expectState('ok');
    expect(screen.getByText('new-checkout: true (api)')).toBeTruthy();
    expect(screen.getByText('dark-mode: false (env)')).toBeTruthy();
    expect(screen.getByText('beta: false (default)')).toBeTruthy();
    expect(screen.queryByText(/not-declared/)).toBeNull();
  });

  it.each([
    ['network error', () => Promise.reject(new TypeError('Failed to fetch'))],
    [
      'non-2xx',
      () =>
        Promise.resolve(
          json({ error: { code: 'VALIDATION_ERROR', message: 'x', requestId: 'r' } }, 500),
        ),
    ],
    ['invalid JSON', () => Promise.resolve(new Response('<html>not json', { status: 200 }))],
    [
      'schema-invalid body',
      () => Promise.resolve(json({ data: { flags: { 'new-checkout': 'yes' } } })),
    ],
    ['body without data envelope', () => Promise.resolve(json({ flags: { beta: true } }))],
  ])('sets unavailable and keeps fallback values on %s', async (_name, responder) => {
    const { fetch } = fakeFetch(responder);
    renderProbe(config(fetch));

    await expectState('unavailable');
    expectFallbackValues();
  });

  it('aborts a fetch that exceeds the timeout and sets unavailable', async () => {
    vi.useFakeTimers();
    const never = deferred();
    const { fetch, calls } = fakeFetch(() => never.promise);
    renderProbe(config(fetch, { timeoutMs: 500 }));

    const signal = calls[0]?.signal;
    expect(signal?.aborted).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(499);
    });
    expect(signal?.aborted).toBe(false);
    expect(screen.getByRole('status').textContent).toBe('state: loading');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(signal?.aborted).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('state: unavailable');
    expectFallbackValues();
  });

  it('times out even when fetch ignores the abort signal', async () => {
    vi.useFakeTimers();
    const ignoresSignal: FetchLike = () => new Promise<Response>(() => undefined);
    renderProbe(config(ignoresSignal, { timeoutMs: 100 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(screen.getByRole('status').textContent).toBe('state: unavailable');
  });

  it('recovers through refresh after a failure', async () => {
    const { fetch, calls } = fakeFetch(
      () => Promise.reject(new TypeError('Failed to fetch')),
      () => Promise.resolve(json(evaluateBody({ beta: true }))),
    );
    renderProbe(config(fetch));
    await expectState('unavailable');
    expectFallbackValues();

    await act(async () => {
      screen.getByRole('button', { name: 'Refresh' }).click();
    });

    await expectState('ok');
    expect(screen.getByText('beta: true (api)')).toBeTruthy();
    expect(calls).toHaveLength(2);
  });

  it('falls back again when a refresh fails after a success', async () => {
    const { fetch } = fakeFetch(
      () => Promise.resolve(json(evaluateBody({ beta: true }))),
      () => Promise.resolve(json({}, 503)),
    );
    renderProbe(config(fetch));
    await expectState('ok');

    await act(async () => {
      screen.getByRole('button', { name: 'Refresh' }).click();
    });

    await expectState('unavailable');
    expectFallbackValues();
  });

  it('shares one in-flight request between concurrent refresh calls', async () => {
    const pending = deferred();
    const { fetch, calls } = fakeFetch(
      () => pending.promise,
      () => Promise.resolve(json(evaluateBody({ beta: false }))),
    );
    const captured: Array<() => Promise<void>> = [];
    function Capture() {
      captured.push(useFlagState().refresh);
      return null;
    }
    render(
      <FlagProvider config={config(fetch)}>
        <Capture />
      </FlagProvider>,
    );
    const refresh = captured[0];
    if (refresh === undefined) throw new Error('refresh was not captured');
    expect(calls).toHaveLength(1);

    const first = refresh();
    const second = refresh();
    expect(second).toBe(first);
    expect(calls).toHaveLength(1);

    await act(async () => {
      pending.resolve(json(evaluateBody({ beta: true })));
      await first;
    });

    await act(async () => {
      await refresh();
    });
    expect(calls).toHaveLength(2);
  });

  it('is unavailable without calling fetch when the API URL is missing', async () => {
    const { fetch, calls } = fakeFetch();
    renderProbe(config(fetch, { baseUrl: undefined }));

    await expectState('unavailable');
    expectFallbackValues();
    await act(async () => {
      screen.getByRole('button', { name: 'Refresh' }).click();
    });
    expect(calls).toHaveLength(0);
  });

  it('treats a blank API URL as missing', async () => {
    const { fetch, calls } = fakeFetch();
    renderProbe(config(fetch, { baseUrl: '   ' }));

    await expectState('unavailable');
    expect(calls).toHaveLength(0);
  });

  it('joins the base URL and path without a double slash', () => {
    const { fetch, calls } = fakeFetch(() => deferred().promise);
    renderProbe(config(fetch, { baseUrl: 'http://flags.test/api/' }));
    expect(calls[0]?.url).toBe('http://flags.test/api/evaluate');
  });

  it('uses the 2000 ms default when the env timeout is invalid', async () => {
    vi.useFakeTimers();
    const never = deferred();
    const { fetch, calls } = fakeFetch(() => never.promise);
    const cfg = flagConfigFromEnv(
      { VITE_FLAGS_API_URL: 'http://flags.test', VITE_FLAGS_TIMEOUT_MS: 'soon' },
      fetch,
    );
    renderProbe(cfg);

    const signal = calls[0]?.signal;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(signal?.aborted).toBe(false);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(signal?.aborted).toBe(true);
  });

  it('aborts the in-flight request on unmount and does not update state afterwards', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const pending = deferred();
    const { fetch, calls } = fakeFetch(() => pending.promise);
    const view = renderProbe(config(fetch));
    const signal = calls[0]?.signal;
    expect(signal?.aborted).toBe(false);

    view.unmount();
    expect(signal?.aborted).toBe(true);

    pending.resolve(json(evaluateBody({ beta: true })));
    await act(async () => {
      await Promise.resolve();
    });
    expect(errors).not.toHaveBeenCalled();
  });
});

describe('useFlag', () => {
  it('returns value and source for api, env and default', async () => {
    const { fetch } = fakeFetch(() => Promise.resolve(json(evaluateBody({ 'new-checkout': true }))));
    renderProbe(config(fetch));

    await expectState('ok');
    expect(screen.getByText('new-checkout: true (api)')).toBeTruthy();
    expect(screen.getByText('dark-mode: false (env)')).toBeTruthy();
    expect(screen.getByText('beta: false (default)')).toBeTruthy();
  });

  it('fails clearly outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow('useFlagState must be used inside a FlagProvider');
  });

  it('rejects an undeclared key at compile time', () => {
    function Misuse() {
      // @ts-expect-error 'undeclared' is not in the registry; this proves the compile-time check.
      useFlag('undeclared');
      return null;
    }
    expect(typeof Misuse).toBe('function');
  });
});

describe('parseTimeoutMs', () => {
  it.each([
    ['1500', 1500],
    [' 750 ', 750],
    [undefined, 2000],
    ['', 2000],
    ['0', 2000],
    ['-5', 2000],
    ['1.5', 2000],
    ['abc', 2000],
    ['10s', 2000],
    ['99999999999999999999', 2000],
  ])('parses %j as %d', (raw, expected) => {
    expect(parseTimeoutMs(raw)).toBe(expected);
  });
});

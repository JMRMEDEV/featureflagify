import { evaluateResponseSchema, type FlagValues } from '@featureflagify/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_TIMEOUT_MS, type FetchLike, type FlagProviderConfig } from './config';
import type { FlagRegistry } from './registry';
import { resolveFlags, type ResolvedFlag } from './resolver';

/** `loading` until the first fetch settles, then `ok` or `unavailable`. */
export type FlagApiState = 'loading' | 'ok' | 'unavailable';

export type FlagContextValue<K extends string> = {
  readonly flags: Readonly<Record<K, ResolvedFlag>>;
  readonly state: FlagApiState;
  /** Refetches the flags. Never rejects. Concurrent calls share one request. */
  readonly refresh: () => Promise<void>;
};

type LoadedState = {
  readonly api: FlagValues | undefined;
  readonly state: FlagApiState;
};

function evaluateUrl(baseUrl: string | undefined): string | undefined {
  const trimmed = baseUrl?.trim().replace(/\/+$/, '');
  return trimmed === undefined || trimmed === '' ? undefined : `${trimmed}/evaluate`;
}

/**
 * One GET /evaluate with a timeout. Resolves with the API map, or `undefined` for
 * every failure kind (network, non-2xx, bad JSON, schema mismatch, timeout, abort).
 * Never rejects.
 */
async function loadFlags(
  url: string,
  fetchFn: FetchLike,
  timeoutMs: number,
  controller: AbortController,
): Promise<FlagValues | undefined> {
  const { signal } = controller;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Rejects on abort, so a fetch that ignores the signal still ends at the timeout.
  const aborted = new Promise<never>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Flag fetch aborted')), { once: true });
  });
  const work = (async (): Promise<FlagValues> => {
    const response = await fetchFn(url, {
      method: 'GET',
      signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Flag API returned ${response.status}`);
    const body: unknown = await response.json();
    return evaluateResponseSchema.parse(body).data.flags;
  })();
  try {
    return await Promise.race([work, aborted]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export type FlagKit<K extends string> = {
  FlagProvider: (props: { config: FlagProviderConfig; children: ReactNode }) => ReactNode;
  /** Resolved value and source of one declared flag. Throws outside a provider. */
  useFlag: (key: K) => ResolvedFlag;
  /** API state and `refresh`. Throws outside a provider. */
  useFlagState: () => Pick<FlagContextValue<K>, 'state' | 'refresh'>;
};

/**
 * Binds a provider and hooks to one registry (D2, D6). The key type `K` comes from
 * the registry, so `useFlag('undeclared')` fails typecheck.
 */
export function createFlagKit<K extends string>(registry: FlagRegistry<K>): FlagKit<K> {
  const FlagContext = createContext<FlagContextValue<K> | null>(null);

  function FlagProvider({
    config,
    children,
  }: {
    config: FlagProviderConfig;
    children: ReactNode;
  }): ReactNode {
    const { baseUrl, timeoutMs, fetch: fetchFn, env } = config;
    const url = evaluateUrl(baseUrl);
    const timeout =
      Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;

    const [loaded, setLoaded] = useState<LoadedState>({
      api: undefined,
      state: url === undefined ? 'unavailable' : 'loading',
    });
    const inFlight = useRef<Promise<void> | null>(null);
    const active = useRef<AbortController | null>(null);

    const refresh = useCallback((): Promise<void> => {
      if (inFlight.current !== null) return inFlight.current;
      if (url === undefined) {
        setLoaded({ api: undefined, state: 'unavailable' });
        return Promise.resolve();
      }
      const controller = new AbortController();
      active.current = controller;
      const run = loadFlags(url, fetchFn, timeout, controller).then((api) => {
        // Unmounted or superseded: do not touch state.
        if (active.current !== controller) return;
        active.current = null;
        inFlight.current = null;
        setLoaded(api === undefined ? { api: undefined, state: 'unavailable' } : { api, state: 'ok' });
      });
      inFlight.current = run;
      return run;
    }, [url, fetchFn, timeout]);

    useEffect(() => {
      void refresh();
      return () => {
        active.current?.abort();
        active.current = null;
        inFlight.current = null;
      };
    }, [refresh]);

    const flags = useMemo(
      () => resolveFlags(registry, loaded.api, env),
      [loaded.api, env],
    );
    const value = useMemo<FlagContextValue<K>>(
      () => ({ flags, state: loaded.state, refresh }),
      [flags, loaded.state, refresh],
    );
    return <FlagContext.Provider value={value}>{children}</FlagContext.Provider>;
  }

  function useFlagContext(hook: string): FlagContextValue<K> {
    const context = useContext(FlagContext);
    if (context === null) {
      throw new Error(`${hook} must be used inside a FlagProvider`);
    }
    return context;
  }

  function useFlag(key: K): ResolvedFlag {
    return useFlagContext('useFlag').flags[key];
  }

  function useFlagState(): Pick<FlagContextValue<K>, 'state' | 'refresh'> {
    const { state, refresh } = useFlagContext('useFlagState');
    return { state, refresh };
  }

  return { FlagProvider, useFlag, useFlagState };
}

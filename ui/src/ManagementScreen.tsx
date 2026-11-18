import type { Flag } from '@featureflagify/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ManagementClient, ManagementError } from './api/management-client';
import { CreateFlagForm } from './CreateFlagForm';
import type { FlagApiState, ResolvedFlag } from './flags';
import { formatTimestamp } from './format';

/** A flag this client declares in code, with how it resolved. */
export type DeclaredFlag = ResolvedFlag & { readonly key: string };

export type ManagementScreenProps = {
  readonly client: ManagementClient;
  /** State of the evaluate provider. `unavailable` turns management actions off. */
  readonly apiState: FlagApiState;
  /** Refetches the provider values. Never rejects. */
  readonly refresh: () => Promise<void>;
  readonly declared: readonly DeclaredFlag[];
};

type ListState = 'loading' | 'ready' | 'error';

const UNAVAILABLE_REASON =
  'Creating and toggling flags is disabled until the flag API is available.';

function describeToggleFailure(error: ManagementError): string {
  switch (error.kind) {
    case 'network':
      return 'could not reach the flag API.';
    case 'api':
      return error.code === 'INTERNAL_ERROR'
        ? 'the server had a problem.'
        : `the API said "${error.message}".`;
    case 'http':
      return `the flag API answered with status ${error.status}.`;
    case 'invalid-response':
      return 'the flag API sent an unreadable answer.';
    case 'not-configured':
      return 'the flag API URL is not configured.';
    case 'invalid-request':
      return 'the request was not valid.';
  }
}

function onOff(value: boolean): string {
  return value ? 'On' : 'Off';
}

export function ManagementScreen({ client, apiState, refresh, declared }: ManagementScreenProps) {
  const [flags, setFlags] = useState<readonly Flag[]>([]);
  const [listState, setListState] = useState<ListState>('loading');
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [announcement, setAnnouncement] = useState('');
  const pendingRef = useRef<Set<string>>(new Set());
  const loadId = useRef(0);

  const unavailable = apiState === 'unavailable';

  const loadList = useCallback(
    async (silent: boolean): Promise<void> => {
      const id = ++loadId.current;
      if (!silent) setListState('loading');
      const result = await client.listFlags();
      // A newer load started, so this answer is stale.
      if (id !== loadId.current) return;
      // A silent reload must not overwrite an optimistic toggle that is still in flight.
      if (silent && pendingRef.current.size > 0) return;
      if (result.ok) {
        setFlags(result.data);
        setListState('ready');
      } else if (!silent) {
        setListState('error');
      }
    },
    [client],
  );

  useEffect(() => {
    void loadList(false);
    return () => {
      // Invalidate in-flight loads on unmount or when the client changes.
      loadId.current += 1;
    };
  }, [loadList]);

  function replaceFlag(next: Flag): void {
    setFlags((current) => current.map((flag) => (flag.key === next.key ? next : flag)));
  }

  function setEnabledLocally(key: string, enabled: boolean): void {
    setFlags((current) =>
      current.map((flag) => (flag.key === key ? { ...flag, enabled } : flag)),
    );
  }

  async function toggle(flag: Flag): Promise<void> {
    if (unavailable || pendingRef.current.has(flag.key)) return;
    const previous = flag.enabled;
    const next = !previous;
    pendingRef.current.add(flag.key);
    setPending(new Set(pendingRef.current));
    setEnabledLocally(flag.key, next);
    const result = await client.setFlagEnabled(flag.key, next);
    pendingRef.current.delete(flag.key);
    setPending(new Set(pendingRef.current));
    if (result.ok) {
      replaceFlag(result.data);
      setAnnouncement(`Flag ${flag.key} is now ${result.data.enabled ? 'enabled' : 'disabled'}.`);
      void refresh();
      if (pendingRef.current.size === 0) void loadList(true);
    } else {
      setEnabledLocally(flag.key, previous);
      setAnnouncement(
        `Could not ${next ? 'enable' : 'disable'} ${flag.key}: ${describeToggleFailure(result.error)} It is still ${previous ? 'enabled' : 'disabled'}.`,
      );
    }
  }

  function handleCreated(flag: Flag): void {
    setFlags((current) => [flag, ...current.filter((item) => item.key !== flag.key)]);
    setListState('ready');
    setAnnouncement(`Flag ${flag.key} created.`);
    void refresh();
    void loadList(true);
  }

  function retry(): void {
    void refresh();
    void loadList(false);
  }

  const declaredKeys = new Set(declared.map((item) => item.key));
  const apiKeys = new Set(flags.map((flag) => flag.key));

  return (
    <div className="screen">
      {unavailable && (
        <div role="alert" className="banner">
          <p>
            The flag API is unavailable. Values come from the env fallback and code defaults.{' '}
            {UNAVAILABLE_REASON}
          </p>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      <p role="status" className="announcer">
        {announcement}
      </p>

      <CreateFlagForm
        client={client}
        disabled={unavailable}
        disabledReason={UNAVAILABLE_REASON}
        onCreated={handleCreated}
      />

      <section aria-labelledby="flags-heading">
        <h2 id="flags-heading">Flags</h2>
        {listState === 'loading' && <p>Loading flags…</p>}
        {listState === 'error' && (
          <div className="list-error">
            <p>Could not load the flag list.</p>
            <button type="button" onClick={() => void loadList(false)}>
              Reload list
            </button>
          </div>
        )}
        {listState === 'ready' && flags.length === 0 && (
          <p>No flags yet. Create the first one with the form above.</p>
        )}
        {listState === 'ready' && flags.length > 0 && (
          <table>
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Name</th>
                <th scope="col">Description</th>
                <th scope="col">Enabled</th>
                <th scope="col">Last update</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag) => (
                <tr key={flag.key}>
                  <th scope="row">
                    <span id={`flag-key-${flag.key}`}>{flag.key}</span>
                    {!declaredKeys.has(flag.key) && <span className="badge">undeclared</span>}
                  </th>
                  <td>{flag.name}</td>
                  <td>{flag.description}</td>
                  <td>
                    <button
                      type="button"
                      role="switch"
                      className="switch"
                      aria-checked={flag.enabled}
                      aria-labelledby={`flag-key-${flag.key}`}
                      disabled={unavailable || pending.has(flag.key)}
                      onClick={() => void toggle(flag)}
                    >
                      <span aria-hidden="true" className="switch-track" />
                      <span className="switch-text">{onOff(flag.enabled)}</span>
                    </button>
                  </td>
                  <td>
                    <time dateTime={flag.updatedAt}>{formatTimestamp(flag.updatedAt)}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="declared-heading">
        <h2 id="declared-heading">Flags this app declares</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col">Resolved value</th>
              <th scope="col">Source</th>
              <th scope="col">In the API</th>
            </tr>
          </thead>
          <tbody>
            {declared.map((item) => (
              <tr key={item.key}>
                <th scope="row">{item.key}</th>
                <td>{onOff(item.value)}</td>
                <td>{item.source}</td>
                <td>
                  {listState !== 'ready'
                    ? 'Unknown'
                    : apiKeys.has(item.key)
                      ? 'Yes'
                      : 'Missing from API'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

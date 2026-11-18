import { useMemo } from 'react';
import { createManagementClient } from './api/management-client';
import { FlagProvider, useFlag, useFlagState } from './app-flags';
import { flagConfigFromEnv, type FlagProviderConfig } from './flags';
import { ManagementScreen, type DeclaredFlag } from './ManagementScreen';

/** Created once, outside render, so the provider config and fetch stay stable. */
const defaultConfig: FlagProviderConfig = flagConfigFromEnv(
  import.meta.env,
  globalThis.fetch.bind(globalThis),
);

function Screen({ config }: { config: FlagProviderConfig }) {
  const { state, refresh } = useFlagState();
  const newCheckout = useFlag('new-checkout');
  const darkBanner = useFlag('dark-banner');
  const betaSearch = useFlag('beta-search');
  const { baseUrl, fetch: fetchFn, timeoutMs } = config;
  const client = useMemo(
    () => createManagementClient({ baseUrl, fetch: fetchFn, timeoutMs }),
    [baseUrl, fetchFn, timeoutMs],
  );
  const declared: readonly DeclaredFlag[] = [
    { key: 'new-checkout', ...newCheckout },
    { key: 'dark-banner', ...darkBanner },
    { key: 'beta-search', ...betaSearch },
  ];
  return <ManagementScreen client={client} apiState={state} refresh={refresh} declared={declared} />;
}

/** `config` is injectable for tests. Production uses the env config built once above. */
export function App({ config = defaultConfig }: { config?: FlagProviderConfig }) {
  return (
    <FlagProvider config={config}>
      <main>
        <h1>Featureflagify</h1>
        <Screen config={config} />
      </main>
    </FlagProvider>
  );
}

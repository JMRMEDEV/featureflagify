import type { Flag } from '@featureflagify/shared';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createManagementClient } from './api/management-client';
import type { FlagApiState } from './flags';
import { ManagementScreen, type DeclaredFlag } from './ManagementScreen';
import {
  BASE_URL,
  deferred,
  errorBody,
  fakeFetch,
  flagBody,
  json,
  listBody,
  makeFlag,
  type RecordedRequest,
  type Responder,
} from './test/fake-api';

afterEach(cleanup);

const declaredDefault: readonly DeclaredFlag[] = [
  { key: 'new-checkout', value: true, source: 'api' },
  { key: 'dark-banner', value: true, source: 'default' },
  { key: 'beta-search', value: false, source: 'env' },
];

type SetupOptions = {
  flags?: Flag[];
  apiState?: FlagApiState;
  declared?: readonly DeclaredFlag[];
  /** Handles a non-list request. Return undefined to use the stateful default. */
  handler?: (request: RecordedRequest, flags: Flag[]) => Response | Promise<Response> | undefined;
};

/** A stateful fake API: GET lists, POST adds, PATCH updates. A handler can override any call. */
function setup(options: SetupOptions = {}) {
  const flags: Flag[] = [...(options.flags ?? [])];
  const responder: Responder = (request) => {
    const custom = options.handler?.(request, flags);
    if (custom !== undefined) return custom;
    if (request.method === 'GET') return json(listBody(flags));
    if (request.method === 'PATCH') {
      const key = decodeURIComponent(request.url.slice(`${BASE_URL}/flags/`.length));
      const index = flags.findIndex((flag) => flag.key === key);
      const current = flags[index];
      if (current === undefined) return json(errorBody('FLAG_NOT_FOUND', 'Not found'), 404);
      const enabled =
        typeof request.body === 'object' && request.body !== null && 'enabled' in request.body
          ? request.body.enabled === true
          : current.enabled;
      const updated = { ...current, enabled };
      flags[index] = updated;
      return json(flagBody(updated));
    }
    const created = makeFlag(
      typeof request.body === 'object' && request.body !== null && 'key' in request.body
        ? String(request.body.key)
        : 'unknown',
    );
    flags.unshift(created);
    return json(flagBody(created), 201);
  };
  const api = fakeFetch(responder);
  const client = createManagementClient({ baseUrl: BASE_URL, fetch: api.fetch, timeoutMs: 2000 });
  const refresh = vi.fn(() => Promise.resolve());
  const view = render(
    <ManagementScreen
      client={client}
      apiState={options.apiState ?? 'ok'}
      refresh={refresh}
      declared={options.declared ?? declaredDefault}
    />,
  );
  const writes = () => api.requests.filter((request) => request.method !== 'GET');
  return { ...view, refresh, requests: api.requests, writes };
}

function keyInput(): HTMLElement {
  return screen.getByRole('textbox', { name: 'Key' });
}

function inputValue(element: HTMLElement): string {
  if (!(element instanceof HTMLInputElement)) throw new Error('Expected an input element');
  return element.value;
}

function submitCreate(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Create flag' }));
}

function errorTextFor(field: HTMLElement): string {
  const ids = (field.getAttribute('aria-describedby') ?? '').split(' ');
  return ids
    .map((id) => document.getElementById(id))
    .filter((element) => element !== null && element.className.includes('field-error'))
    .map((element) => element?.textContent ?? '')
    .join(' ');
}

describe('flag list', () => {
  it('shows key, name, description, enabled state and a deterministic last update', async () => {
    setup({
      flags: [
        makeFlag('new-checkout', {
          name: 'New checkout',
          description: 'Redesigned flow',
          enabled: true,
          updatedAt: '2026-11-18T16:15:42.000Z',
        }),
      ],
    });
    const list = within(await screen.findByRole('region', { name: 'Flags' }));
    const row = list.getByRole('row', { name: /new-checkout/ });
    expect(within(row).getByRole('rowheader').textContent).toContain('new-checkout');
    expect(within(row).getByText('New checkout')).toBeTruthy();
    expect(within(row).getByText('Redesigned flow')).toBeTruthy();
    expect(within(row).getByRole('switch').getAttribute('aria-checked')).toBe('true');
    expect(within(row).getByText('2026-11-18 16:15 UTC')).toBeTruthy();
  });

  it('shows a loading state until the list arrives', async () => {
    const gate = deferred<Response>();
    setup({ handler: (request) => (request.method === 'GET' ? gate.promise : undefined) });
    expect(screen.getByText('Loading flags…')).toBeTruthy();
    gate.resolve(json(listBody([makeFlag('new-checkout')])));
    expect(await screen.findByRole('switch', { name: 'new-checkout' })).toBeTruthy();
    expect(screen.queryByText('Loading flags…')).toBeNull();
  });

  it('shows an empty state when there are no flags', async () => {
    setup({ flags: [] });
    expect(await screen.findByText(/No flags yet/)).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('shows a reload button when the list cannot be loaded', async () => {
    setup({ handler: (request) => (request.method === 'GET' ? json({}, 500) : undefined) });
    expect(await screen.findByText('Could not load the flag list.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload list' })).toBeTruthy();
  });
});

describe('create form', () => {
  it('rejects an invalid key before sending and ties the error to the field', async () => {
    const { writes } = setup({ flags: [] });
    await screen.findByText(/No flags yet/);
    fireEvent.change(keyInput(), { target: { value: 'Bad Key' } });
    submitCreate();
    const input = keyInput();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(errorTextFor(input).length).toBeGreaterThan(0);
    expect(writes()).toHaveLength(0);
  });

  it('shows the duplicate-key error next to the key field on 409', async () => {
    const { writes } = setup({
      flags: [],
      handler: (request) =>
        request.method === 'POST'
          ? json(errorBody('FLAG_EXISTS', 'A flag with this key already exists'), 409)
          : undefined,
    });
    await screen.findByText(/No flags yet/);
    fireEvent.change(keyInput(), { target: { value: 'new-checkout' } });
    submitCreate();
    await waitFor(() => expect(keyInput().getAttribute('aria-invalid')).toBe('true'));
    expect(errorTextFor(keyInput())).toBe('A flag with this key already exists');
    expect(writes()).toHaveLength(1);
  });

  it('shows 400 details on the matching fields', async () => {
    setup({
      flags: [],
      handler: (request) =>
        request.method === 'POST'
          ? json(
              errorBody('VALIDATION_ERROR', 'Invalid request', [
                { field: 'name', message: 'Name is too long' },
                { field: 'body', message: 'Unexpected field' },
              ]),
              400,
            )
          : undefined,
    });
    await screen.findByText(/No flags yet/);
    fireEvent.change(keyInput(), { target: { value: 'new-checkout' } });
    submitCreate();
    const name = screen.getByRole('textbox', { name: 'Name (optional)' });
    await waitFor(() => expect(name.getAttribute('aria-invalid')).toBe('true'));
    expect(errorTextFor(name)).toBe('Name is too long');
    expect(keyInput().getAttribute('aria-invalid')).toBe('false');
    expect(screen.getByRole('alert').textContent).toContain('body: Unexpected field');
  });

  it('shows a generic message on 500 and keeps the input', async () => {
    setup({
      flags: [],
      handler: (request) =>
        request.method === 'POST'
          ? json(errorBody('INTERNAL_ERROR', 'Internal error'), 500)
          : undefined,
    });
    await screen.findByText(/No flags yet/);
    fireEvent.change(keyInput(), { target: { value: 'new-checkout' } });
    submitCreate();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('The server had a problem');
    expect(inputValue(keyInput())).toBe('new-checkout');
  });

  it('clears the form, adds the flag, announces it and refreshes on success', async () => {
    const { refresh, writes } = setup({ flags: [] });
    await screen.findByText(/No flags yet/);
    fireEvent.change(keyInput(), { target: { value: 'new-checkout' } });
    submitCreate();
    expect(await screen.findByRole('switch', { name: 'new-checkout' })).toBeTruthy();
    expect(inputValue(keyInput())).toBe('');
    expect(screen.getByRole('status').textContent).toBe('Flag new-checkout created.');
    expect(writes()).toHaveLength(1);
    expect(writes()[0]?.body).toEqual({ key: 'new-checkout' });
    expect(refresh).toHaveBeenCalled();
  });

  it('clears an earlier server error once the user edits the field', async () => {
    setup({
      flags: [],
      handler: (request) =>
        request.method === 'POST'
          ? json(errorBody('FLAG_EXISTS', 'A flag with this key already exists'), 409)
          : undefined,
    });
    await screen.findByText(/No flags yet/);
    fireEvent.change(keyInput(), { target: { value: 'new-checkout' } });
    submitCreate();
    await waitFor(() => expect(keyInput().getAttribute('aria-invalid')).toBe('true'));
    fireEvent.change(keyInput(), { target: { value: 'new-checkout-2' } });
    expect(keyInput().getAttribute('aria-invalid')).toBe('false');
  });
});

describe('toggle switch', () => {
  it('is a labelled switch with aria-checked', async () => {
    setup({
      flags: [makeFlag('new-checkout', { enabled: true }), makeFlag('dark-banner')],
    });
    const on = await screen.findByRole('switch', { name: 'new-checkout' });
    const off = screen.getByRole('switch', { name: 'dark-banner' });
    expect(on.getAttribute('aria-checked')).toBe('true');
    expect(off.getAttribute('aria-checked')).toBe('false');
  });

  it('updates at once, then announces success and refreshes', async () => {
    const gate = deferred<Response>();
    const { refresh } = setup({
      flags: [makeFlag('new-checkout')],
      handler: (request, flags) =>
        request.method === 'PATCH'
          ? gate.promise.then((response) => {
              flags[0] = makeFlag('new-checkout', { enabled: true });
              return response;
            })
          : undefined,
    });
    const toggle = await screen.findByRole('switch', { name: 'new-checkout' });
    fireEvent.click(toggle);
    // The request has not answered yet, and the switch is already on.
    expect(screen.getByRole('switch', { name: 'new-checkout' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(screen.getByRole('status').textContent).toBe('');
    gate.resolve(json(flagBody(makeFlag('new-checkout', { enabled: true }))));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('Flag new-checkout is now enabled.'),
    );
    expect(screen.getByRole('switch', { name: 'new-checkout' }).getAttribute('aria-checked')).toBe(
      'true',
    );
    expect(refresh).toHaveBeenCalled();
  });

  const failures: ReadonlyArray<readonly [string, () => Response | Promise<Response>, string]> = [
    ['a network error', () => Promise.reject(new TypeError('Failed to fetch')), 'could not reach'],
    [
      'a non-2xx answer',
      () => json(errorBody('INTERNAL_ERROR', 'Internal error'), 500),
      'the server had a problem',
    ],
    ['an invalid body', () => json({ data: { flag: { key: 1 } } }), 'unreadable answer'],
  ];

  it.each(failures)('rolls back and announces the error on %s', async (_label, respond, text) => {
    const { refresh } = setup({
      flags: [makeFlag('new-checkout')],
      handler: (request) => (request.method === 'PATCH' ? respond() : undefined),
    });
    fireEvent.click(await screen.findByRole('switch', { name: 'new-checkout' }));
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Could not enable new-checkout'),
    );
    expect(screen.getByRole('status').textContent).toContain(text);
    expect(screen.getByRole('status').textContent).toContain('still disabled');
    expect(screen.getByRole('switch', { name: 'new-checkout' }).getAttribute('aria-checked')).toBe(
      'false',
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it('sends one request while a toggle for that key is in flight', async () => {
    const gate = deferred<Response>();
    const { writes } = setup({
      flags: [makeFlag('new-checkout')],
      handler: (request) => (request.method === 'PATCH' ? gate.promise : undefined),
    });
    const toggle = await screen.findByRole('switch', { name: 'new-checkout' });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(writes()).toHaveLength(1);
    expect(toggle.matches(':disabled')).toBe(true);
    gate.resolve(json(flagBody(makeFlag('new-checkout', { enabled: true }))));
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'new-checkout' }).matches(':disabled')).toBe(false),
    );
    expect(writes()).toHaveLength(1);
  });
});

describe('API unavailable', () => {
  it('shows a banner, disables actions with an explanation, and retries through refresh', async () => {
    const { refresh, writes } = setup({
      apiState: 'unavailable',
      flags: [makeFlag('new-checkout')],
    });
    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toContain('The flag API is unavailable');
    expect(banner.textContent).toContain('disabled until the flag API is available');
    const toggle = await screen.findByRole('switch', { name: 'new-checkout' });
    expect(toggle.matches(':disabled')).toBe(true);
    expect(keyInput().matches(':disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Create flag' }).matches(':disabled')).toBe(true);
    fireEvent.click(toggle);
    expect(writes()).toHaveLength(0);
    fireEvent.click(within(banner).getByRole('button', { name: 'Retry' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows no banner and enables actions when the API is ok', async () => {
    setup({ apiState: 'ok', flags: [makeFlag('new-checkout')] });
    const toggle = await screen.findByRole('switch', { name: 'new-checkout' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(toggle.matches(':disabled')).toBe(false);
  });
});

describe('declared flags section', () => {
  it('shows value and source, marks missing and undeclared flags', async () => {
    setup({
      flags: [makeFlag('new-checkout', { enabled: true }), makeFlag('legacy-banner')],
    });
    await screen.findByRole('switch', { name: 'new-checkout' });

    const declared = within(screen.getByRole('region', { name: 'Flags this app declares' }));
    const api = declared.getByRole('row', { name: /new-checkout/ });
    expect(within(api).getByText('On')).toBeTruthy();
    expect(within(api).getByText('api')).toBeTruthy();
    expect(within(api).getByText('Yes')).toBeTruthy();

    const missing = declared.getByRole('row', { name: /dark-banner/ });
    expect(within(missing).getByText('default')).toBeTruthy();
    expect(within(missing).getByText('Missing from API')).toBeTruthy();

    const env = declared.getByRole('row', { name: /beta-search/ });
    expect(within(env).getByText('env')).toBeTruthy();
    expect(within(env).getByText('Off')).toBeTruthy();

    const list = within(screen.getByRole('region', { name: 'Flags' }));
    expect(within(list.getByRole('row', { name: /legacy-banner/ })).getByText('undeclared')).toBeTruthy();
    expect(within(list.getByRole('row', { name: /new-checkout/ })).queryByText('undeclared')).toBeNull();
  });

  it('does not claim a declared flag is missing before the list has loaded', () => {
    const gate = deferred<Response>();
    setup({ handler: (request) => (request.method === 'GET' ? gate.promise : undefined) });
    const declared = within(screen.getByRole('region', { name: 'Flags this app declares' }));
    expect(declared.queryByText('Missing from API')).toBeNull();
    expect(declared.getAllByText('Unknown')).toHaveLength(3);
  });
});

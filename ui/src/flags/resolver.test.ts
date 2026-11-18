import { flagEnvName } from '@featureflagify/shared';
import { describe, expect, it } from 'vitest';
import { defineFlags, type FlagRegistry } from './registry';
import { parseEnvFlag, resolveFlags } from './resolver';

const registry = defineFlags({ 'new-checkout': false, 'dark-mode': true });
const ENV_NEW_CHECKOUT = 'VITE_FF_NEW_CHECKOUT';

describe('defineFlags', () => {
  it('keeps the declared keys and defaults', () => {
    expect(registry.keys).toEqual(['new-checkout', 'dark-mode']);
    expect(registry.defaults).toEqual({ 'new-checkout': false, 'dark-mode': true });
  });

  it('takes the env name from the shared helper', () => {
    expect(registry.envNames['new-checkout']).toBe(flagEnvName('new-checkout'));
    expect(registry.envNames['new-checkout']).toBe(ENV_NEW_CHECKOUT);
  });

  it('throws for a key the shared schema rejects', () => {
    expect(() => defineFlags({ 'Bad_Key': true })).toThrow();
  });

  it('rejects an undeclared key at compile time', () => {
    const resolved = resolveFlags(registry, undefined, {});
    expect(resolved['new-checkout'].source).toBe('default');
    // @ts-expect-error 'new-chekout' is not declared, so this line must fail typecheck.
    void resolved['new-chekout'];
    const declared: FlagRegistry<'new-checkout'> = defineFlags({ 'new-checkout': false });
    expect(declared.keys).toEqual(['new-checkout']);
  });
});

describe('parseEnvFlag', () => {
  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
  ])('accepts %j as %s', (raw, expected) => {
    expect(parseEnvFlag(raw)).toBe(expected);
  });

  it.each(['yes', 'no', '', 'TRUE', 'False', ' true', '2', 'on'])('ignores %j', (raw) => {
    expect(parseEnvFlag(raw)).toBeUndefined();
  });

  it('ignores undefined', () => {
    expect(parseEnvFlag(undefined)).toBeUndefined();
  });
});

describe('resolveFlags order', () => {
  it('uses the API value true over env and default', () => {
    const r = resolveFlags(registry, { 'new-checkout': true }, { [ENV_NEW_CHECKOUT]: 'false' });
    expect(r['new-checkout']).toEqual({ value: true, source: 'api' });
  });

  it('uses the API value false over an env true and a default true', () => {
    const r = resolveFlags(registry, { 'dark-mode': false }, { VITE_FF_DARK_MODE: 'true' });
    expect(r['dark-mode']).toEqual({ value: false, source: 'api' });
  });

  it('falls through to env when the key is absent from the API map', () => {
    const r = resolveFlags(registry, { 'dark-mode': false }, { [ENV_NEW_CHECKOUT]: '1' });
    expect(r['new-checkout']).toEqual({ value: true, source: 'env' });
  });

  it('falls through to env when the API map is undefined', () => {
    const r = resolveFlags(registry, undefined, { VITE_FF_DARK_MODE: '0' });
    expect(r['dark-mode']).toEqual({ value: false, source: 'env' });
  });

  it('falls through to the default when env is invalid', () => {
    const r = resolveFlags(registry, {}, { [ENV_NEW_CHECKOUT]: 'yes', VITE_FF_DARK_MODE: 'TRUE' });
    expect(r['new-checkout']).toEqual({ value: false, source: 'default' });
    expect(r['dark-mode']).toEqual({ value: true, source: 'default' });
  });

  it('falls through to the default when nothing is set', () => {
    const r = resolveFlags(registry, undefined, {});
    expect(r['new-checkout']).toEqual({ value: false, source: 'default' });
    expect(r['dark-mode']).toEqual({ value: true, source: 'default' });
  });

  it('reads env only under the name the shared helper gives', () => {
    const r = resolveFlags(registry, undefined, { [flagEnvName('new-checkout')]: 'true', NEW_CHECKOUT: 'true' });
    expect(r['new-checkout']).toEqual({ value: true, source: 'env' });
    const wrong = resolveFlags(registry, undefined, { NEW_CHECKOUT: 'true', 'VITE_FF_new-checkout': 'true' });
    expect(wrong['new-checkout'].source).toBe('default');
  });

  it('ignores inherited object properties as API or env values', () => {
    const protoRegistry = defineFlags({ constructor: false });
    const r = resolveFlags(protoRegistry, {}, {});
    expect(r.constructor).toEqual({ value: false, source: 'default' });
  });

  it('resolves each flag independently', () => {
    const r = resolveFlags(registry, { 'new-checkout': true }, { VITE_FF_DARK_MODE: 'false' });
    expect(r['new-checkout'].source).toBe('api');
    expect(r['dark-mode']).toEqual({ value: false, source: 'env' });
  });
});

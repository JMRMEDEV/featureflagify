import { createFlagKit, defineFlags } from './flags';

/** The flags this demo app declares, with their code defaults (D2). */
export const registry = defineFlags({
  'new-checkout': false,
  'dark-banner': true,
  'beta-search': false,
});

export const { FlagProvider, useFlag, useFlagState } = createFlagKit(registry);

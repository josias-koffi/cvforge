import { describe, it, expect } from 'vitest';
import { resolveOpenRouterBalanceConfig } from './openrouter-balance.config';

describe('resolveOpenRouterBalanceConfig', () => {
  it('disables supervision instead of throwing when the management key is missing', () => {
    expect(resolveOpenRouterBalanceConfig({})).toEqual({
      alertThreshold: 5,
      baseUrl: 'https://openrouter.ai/api/v1',
      criticalThreshold: 0,
      managementApiKey: '',
    });
  });

  it('reads the management key, base url and threshold', () => {
    expect(
      resolveOpenRouterBalanceConfig({
        OPENROUTER_BALANCE_ALERT_THRESHOLD: '12.5',
        OPENROUTER_BASE_URL: ' https://proxy.example/api/v1 ',
        OPENROUTER_MANAGEMENT_API_KEY: ' sk-or-mgmt ',
      }),
    ).toEqual({
      alertThreshold: 12.5,
      baseUrl: 'https://proxy.example/api/v1',
      criticalThreshold: 0,
      managementApiKey: 'sk-or-mgmt',
    });
  });

  it('falls back to the default threshold for unusable values', () => {
    const thresholdFor = (raw: string) =>
      resolveOpenRouterBalanceConfig({
        OPENROUTER_BALANCE_ALERT_THRESHOLD: raw,
      }).alertThreshold;

    expect(thresholdFor('0')).toBe(5);
    expect(thresholdFor('-3')).toBe(5);
    expect(thresholdFor('abc')).toBe(5);
  });

  it('accepts zero as a critical threshold but rejects a negative one', () => {
    const criticalFor = (raw: string) =>
      resolveOpenRouterBalanceConfig({
        OPENROUTER_BALANCE_CRITICAL_THRESHOLD: raw,
      }).criticalThreshold;

    expect(criticalFor('0')).toBe(0);
    expect(criticalFor('2.5')).toBe(2.5);
    expect(criticalFor('-1')).toBe(0);
    expect(criticalFor('nope')).toBe(0);
  });
});

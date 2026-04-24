import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveOpenRouterConfig } from './openrouter.config';

describe('resolveOpenRouterConfig', () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
  });

  it('throws when OPENROUTER_API_KEY is missing', () => {
    delete process.env.OPENROUTER_API_KEY;
    expect(() => resolveOpenRouterConfig()).toThrow('OPENROUTER_API_KEY');
  });

  it('returns config with provided api key', () => {
    process.env.OPENROUTER_API_KEY = 'my-key';
    const config = resolveOpenRouterConfig();
    expect(config.apiKey).toBe('my-key');
  });

  it('uses the default OpenRouter base URL', () => {
    process.env.OPENROUTER_API_KEY = 'key';
    delete process.env.OPENROUTER_BASE_URL;
    const config = resolveOpenRouterConfig();
    expect(config.baseUrl).toBe('https://openrouter.ai/api/v1');
  });

  it('uses OPENROUTER_BASE_URL when set', () => {
    process.env.OPENROUTER_API_KEY = 'key';
    process.env.OPENROUTER_BASE_URL = 'https://custom.example.com/v1';
    const config = resolveOpenRouterConfig();
    expect(config.baseUrl).toBe('https://custom.example.com/v1');
  });

  it('uses the default Mistral Small 4 model', () => {
    process.env.OPENROUTER_API_KEY = 'key';
    delete process.env.OPENROUTER_MODEL;
    const config = resolveOpenRouterConfig();
    expect(config.defaultModel).toBe('mistralai/mistral-small-2603');
  });

  it('uses OPENROUTER_MODEL when set', () => {
    process.env.OPENROUTER_API_KEY = 'key';
    process.env.OPENROUTER_MODEL = 'mistralai/mistral-large';
    const config = resolveOpenRouterConfig();
    expect(config.defaultModel).toBe('mistralai/mistral-large');
  });

  it('defaults enableZdrChat and enableZdrStt to false when unset', () => {
    process.env.OPENROUTER_API_KEY = 'key';
    delete process.env.ENABLE_ZDR_CHAT;
    delete process.env.ENABLE_ZDR_STT;
    const config = resolveOpenRouterConfig();
    expect(config.enableZdrChat).toBe(false);
    expect(config.enableZdrStt).toBe(false);
  });

  it('sets enableZdrChat to true when ENABLE_ZDR_CHAT=true', () => {
    process.env.OPENROUTER_API_KEY = 'key';
    process.env.ENABLE_ZDR_CHAT = 'true';
    const config = resolveOpenRouterConfig();
    expect(config.enableZdrChat).toBe(true);
  });

  it('sets enableZdrStt to true when ENABLE_ZDR_STT=true', () => {
    process.env.OPENROUTER_API_KEY = 'key';
    process.env.ENABLE_ZDR_STT = 'true';
    const config = resolveOpenRouterConfig();
    expect(config.enableZdrStt).toBe(true);
  });

  it('keeps ZDR flags false for values other than "true"', () => {
    process.env.OPENROUTER_API_KEY = 'key';
    process.env.ENABLE_ZDR_CHAT = '1';
    process.env.ENABLE_ZDR_STT = 'yes';
    const config = resolveOpenRouterConfig();
    expect(config.enableZdrChat).toBe(false);
    expect(config.enableZdrStt).toBe(false);
  });
});

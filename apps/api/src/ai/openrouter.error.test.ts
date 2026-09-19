import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  OpenRouterRequestError,
  buildOpenRouterError,
  isRetryableStatus,
  parseRetryAfterMs,
} from './openrouter.error';

const UPSTREAM_429_BODY = JSON.stringify({
  error: {
    code: 429,
    message: 'Provider returned error',
    metadata: {
      is_byok: false,
      limit_source: 'upstream_provider_shared_pool',
      provider_name: 'Mistral',
    },
  },
});

describe('buildOpenRouterError', () => {
  it('captures status, detail and provider name from an upstream 429', async () => {
    const response = new Response(UPSTREAM_429_BODY, {
      status: 429,
      statusText: 'Too Many Requests',
    });

    const error = await buildOpenRouterError(response, 'OpenRouter request failed');

    expect(error).toBeInstanceOf(OpenRouterRequestError);
    expect(error.status).toBe(429);
    expect(error.providerName).toBe('Mistral');
    expect(error.isRateLimited).toBe(true);
    expect(error.isRetryable).toBe(true);
    expect(error.message).toContain('OpenRouter request failed: 429 Too Many Requests');
    expect(error.detail).toBe(UPSTREAM_429_BODY);
  });

  it('reads Retry-After into retryAfterMs', async () => {
    const response = new Response('{}', { status: 429, headers: { 'Retry-After': '3' } });
    const error = await buildOpenRouterError(response, 'OpenRouter request failed');
    expect(error.retryAfterMs).toBe(3000);
  });

  it('marks a 400 as non-retryable and keeps providerName null on a non-JSON body', async () => {
    const response = new Response('nope', { status: 400, statusText: 'Bad Request' });
    const error = await buildOpenRouterError(response, 'OpenRouter request failed');

    expect(error.isRetryable).toBe(false);
    expect(error.isRateLimited).toBe(false);
    expect(error.providerName).toBeNull();
    expect(error.retryAfterMs).toBeNull();
  });
});

describe('parseRetryAfterMs', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null without a header and for an unparseable one', () => {
    expect(parseRetryAfterMs(null)).toBeNull();
    expect(parseRetryAfterMs('soon')).toBeNull();
  });

  it('reads an HTTP date relative to now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T12:00:00Z'));
    expect(parseRetryAfterMs('Sat, 19 Sep 2026 12:00:05 GMT')).toBe(5000);
  });

  it('clamps a past date to zero and an absurd delay to 30s', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T12:00:00Z'));
    expect(parseRetryAfterMs('Sat, 19 Sep 2026 11:59:00 GMT')).toBe(0);
    expect(parseRetryAfterMs('3600')).toBe(30_000);
  });
});

describe('isRetryableStatus', () => {
  it('covers throttling and gateway faults but not client errors', () => {
    expect([429, 500, 502, 503, 504].every(isRetryableStatus)).toBe(true);
    expect([400, 401, 403, 404, 422].some(isRetryableStatus)).toBe(false);
  });
});

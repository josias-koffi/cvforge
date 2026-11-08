import { describe, it, expect, vi, afterEach } from 'vitest';
import { APICallError } from 'ai';
import {
  OpenRouterRequestError,
  buildEmptyContentError,
  isModelUnavailable,
  isRetryableStatus,
  parseRetryAfterMs,
  toLlmRequestError,
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

function apiError(
  statusCode: number | undefined,
  responseBody?: string,
  responseHeaders?: Record<string, string>,
  cause?: unknown,
) {
  return new APICallError({
    cause,
    message: 'failed',
    requestBodyValues: {},
    responseBody,
    responseHeaders,
    statusCode,
    url: 'https://example.test',
  });
}

describe('toLlmRequestError', () => {
  it('captures status, detail and provider name from an upstream 429', () => {
    const error = toLlmRequestError(apiError(429, UPSTREAM_429_BODY), 'a/model') as OpenRouterRequestError;

    expect(error).toBeInstanceOf(OpenRouterRequestError);
    expect(error.status).toBe(429);
    expect(error.providerName).toBe('Mistral');
    expect(error.isRateLimited).toBe(true);
    expect(error.isRetryable).toBe(true);
    expect(error.message).toContain('AI request failed (a/model): 429');
    expect(error.detail).toBe(UPSTREAM_429_BODY);
    expect(error.model).toBe('a/model');
  });

  it('reads Retry-After into retryAfterMs', () => {
    const error = toLlmRequestError(apiError(429, '{}', { 'retry-after': '3' }), 'a/model');
    expect((error as OpenRouterRequestError).retryAfterMs).toBe(3000);
  });

  it('marks a 400 as non-retryable and keeps providerName null on a non-JSON body', () => {
    const error = toLlmRequestError(apiError(400, 'nope'), 'a/model') as OpenRouterRequestError;

    expect(error.isRetryable).toBe(false);
    expect(error.isRateLimited).toBe(false);
    expect(error.providerName).toBeNull();
    expect(error.retryAfterMs).toBeNull();
  });

  it('gives back the socket failure, which counts as transient', () => {
    const socket = new TypeError('fetch failed');
    expect(toLlmRequestError(apiError(undefined, undefined, undefined, socket), 'a/model')).toBe(socket);
  });

  it('treats a 200 the SDK could not parse as an empty answer', () => {
    expect(toLlmRequestError(apiError(200, '{}'), 'a/model')).toMatchObject({
      message: buildEmptyContentError('a/model').message,
      status: 422,
    });
  });

  it('leaves any other error alone', () => {
    const other = new Error('boom');
    expect(toLlmRequestError(other, 'a/model')).toBe(other);
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

describe('isModelUnavailable', () => {
  it('recognises the allowed-providers 404 that makes a model unroutable', () => {
    const error = new OpenRouterRequestError('failed', 404, '', null, null, 'google/gemini-2.5-flash');
    expect(isModelUnavailable(error)).toBe(true);
  });

  it('is false for a throttle, a bad request and a non-OpenRouter error', () => {
    expect(isModelUnavailable(new OpenRouterRequestError('x', 429, '', null, null))).toBe(false);
    expect(isModelUnavailable(new OpenRouterRequestError('x', 400, '', null, null))).toBe(false);
    expect(isModelUnavailable(new Error('boom'))).toBe(false);
  });
});

describe('isRetryableStatus', () => {
  it('covers throttling and gateway faults but not client errors', () => {
    expect([429, 500, 502, 503, 504].every(isRetryableStatus)).toBe(true);
    expect([400, 401, 403, 404, 422].some(isRetryableStatus)).toBe(false);
  });
});

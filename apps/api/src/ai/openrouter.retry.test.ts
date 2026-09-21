import { describe, it, expect, vi } from 'vitest';
import { OpenRouterRequestError } from './openrouter.error';
import { DEFAULT_RETRY_POLICY, withRetry } from './openrouter.retry';

function rateLimitError(retryAfterMs: number | null = null) {
  return new OpenRouterRequestError('throttled', 429, '', retryAfterMs, 'Mistral');
}

const POLICY = { ...DEFAULT_RETRY_POLICY, maxAttempts: 3 };

/** `random: () => 1` removes jitter so delays are the full exponential step. */
function hooks(sleep = vi.fn((_delayMs: number) => Promise.resolve())) {
  return { hooks: { random: () => 1, sleep }, sleep };
}

describe('withRetry', () => {
  it('returns the first successful result without sleeping', async () => {
    const { hooks: h, sleep } = hooks();
    await expect(withRetry(() => Promise.resolve('ok'), POLICY, h)).resolves.toBe('ok');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries a retryable error until it succeeds', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError())
      .mockResolvedValueOnce('ok');

    await expect(withRetry(operation, POLICY, hooks().hooks)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('backs off exponentially between attempts', async () => {
    const { hooks: h, sleep } = hooks();
    const operation = vi.fn().mockRejectedValue(rateLimitError());

    await expect(withRetry(operation, POLICY, h)).rejects.toThrow('throttled');
    expect(sleep.mock.calls.map(([delay]) => delay)).toEqual([500, 1000]);
  });

  it('caps the exponential delay at maxDelayMs', async () => {
    const { hooks: h, sleep } = hooks();
    const operation = vi.fn().mockRejectedValue(rateLimitError());

    await withRetry(operation, { baseDelayMs: 4000, maxAttempts: 3, maxDelayMs: 5000 }, h).catch(
      () => undefined,
    );

    expect(sleep.mock.calls.map(([delay]) => delay)).toEqual([4000, 5000]);
  });

  it('prefers the provider Retry-After over the exponential delay', async () => {
    const { hooks: h, sleep } = hooks();
    const operation = vi.fn().mockRejectedValueOnce(rateLimitError(1500)).mockResolvedValue('ok');

    await withRetry(operation, POLICY, h);
    expect(sleep).toHaveBeenCalledWith(1500);
  });

  it('caps the provider Retry-After at maxDelayMs', async () => {
    // A single `Retry-After: 5` was the six-second gap measured on a live
    // interview: the candidate sat in silence while we obeyed the provider.
    const { hooks: h, sleep } = hooks();
    const operation = vi.fn().mockRejectedValueOnce(rateLimitError(30_000)).mockResolvedValue('ok');

    await withRetry(operation, { baseDelayMs: 200, maxAttempts: 2, maxDelayMs: 900 }, h);
    expect(sleep).toHaveBeenCalledWith(900);
  });

  it('rethrows a non-retryable error immediately', async () => {
    const badRequest = new OpenRouterRequestError('bad', 400, '', null, null);
    const operation = vi.fn().mockRejectedValue(badRequest);

    await expect(withRetry(operation, POLICY, hooks().hooks)).rejects.toThrow('bad');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries a network-level TypeError', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValue('ok');

    await expect(withRetry(operation, POLICY, hooks().hooks)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('runs exactly once when maxAttempts is 1 or invalid', async () => {
    const operation = vi.fn().mockRejectedValue(rateLimitError());

    await expect(
      withRetry(operation, { ...POLICY, maxAttempts: 1 }, hooks().hooks),
    ).rejects.toThrow();
    await expect(
      withRetry(operation, { ...POLICY, maxAttempts: 0 }, hooks().hooks),
    ).rejects.toThrow();

    expect(operation).toHaveBeenCalledTimes(2);
  });
});

import { OpenRouterRequestError } from "./openrouter.error";

export interface RetryPolicy {
  /** Total attempts, first call included. `1` disables retrying. */
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
};

/** Injected in tests so backoff neither sleeps for real nor picks random delays. */
export interface RetryHooks {
  sleep?: (delayMs: number) => Promise<void>;
  random?: () => number;
}

const defaultSleep = (delayMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delayMs));

/**
 * Retries a transient OpenRouter failure with exponential backoff and full
 * jitter, honouring `Retry-After` when the provider sent one. Jitter matters
 * because every pod hitting the same shared provider pool would otherwise
 * retry in lockstep and re-trigger the throttle.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  hooks: RetryHooks = {},
): Promise<T> {
  const sleep = hooks.sleep ?? defaultSleep;
  const random = hooks.random ?? Math.random;
  const maxAttempts = Math.max(1, Math.trunc(policy.maxAttempts) || 1);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt || !isRetryable(error)) throw error;

      await sleep(computeDelayMs(error, attempt, policy, random));
    }
  }

  throw lastError;
}

/** A `fetch` rejection (DNS, socket reset, timeout) is transient too. */
function isRetryable(error: unknown): boolean {
  if (error instanceof OpenRouterRequestError) return error.isRetryable;
  return error instanceof TypeError;
}

function computeDelayMs(
  error: unknown,
  attempt: number,
  policy: RetryPolicy,
  random: () => number,
): number {
  if (error instanceof OpenRouterRequestError && error.retryAfterMs !== null) {
    return error.retryAfterMs;
  }

  const exponentialMs = Math.min(
    policy.baseDelayMs * 2 ** (attempt - 1),
    policy.maxDelayMs,
  );

  return Math.round(exponentialMs * random());
}

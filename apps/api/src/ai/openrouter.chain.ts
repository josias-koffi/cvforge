import type { LlmTarget } from "./llm-types";
import { isModelUnavailable } from "./openrouter.error";
import {
  type RetryHooks,
  type RetryPolicy,
  isTransientFailure,
  withRetry,
} from "./openrouter.retry";

/**
 * Tries each model in turn, retrying a transient failure on one before moving
 * to the next. A 404 skips straight to the next model — the account's
 * allowed-providers and ZDR settings can make one model unroutable while the
 * next is fine. A malformed request or an auth failure aborts the chain
 * instead: every model would reject it identically.
 *
 * That last rule stops at the provider. Past it, the same 400 or 401 says
 * nothing about the next target: Claude out of credit or a revoked key must
 * hand over to OpenRouter, not fail the candidate's CV.
 *
 * We walk the chain ourselves rather than handing OpenRouter a `models` array
 * for two reasons. On `/chat/completions`, a throttled Mistral came back 429 in
 * production without any fallback model ever being attempted. On
 * `/audio/transcriptions`, per-request routing controls are documented as not
 * applied at all, so there is nothing to hand it. Either way the bascule has to
 * be ours to be observable and certain.
 */
export async function runModelChain<T>(
  chain: LlmTarget[],
  attempt: (target: LlmTarget) => Promise<T>,
  policy: RetryPolicy,
  hooks: RetryHooks = {},
): Promise<T> {
  let lastError: unknown;

  for (const [index, target] of chain.entries()) {
    try {
      return await withRetry(() => attempt(target), policy, hooks);
    } catch (error) {
      lastError = error;
      const next = chain[index + 1];
      if (!next) throw error;

      const worthAnotherTarget =
        isTransientFailure(error) ||
        isModelUnavailable(error) ||
        next.provider !== target.provider;
      if (!worthAnotherTarget) throw error;
    }
  }

  throw lastError;
}

/** The targets to try, in order, with no duplicate of the primary. */
export function buildChain(primary: LlmTarget, fallbacks: LlmTarget[]): LlmTarget[] {
  return [
    primary,
    ...fallbacks.filter(
      (target) => target.provider !== primary.provider || target.model !== primary.model,
    ),
  ];
}

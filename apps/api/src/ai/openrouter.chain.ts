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
 * We walk the chain ourselves rather than handing OpenRouter a `models` array
 * for two reasons. On `/chat/completions`, a throttled Mistral came back 429 in
 * production without any fallback model ever being attempted. On
 * `/audio/transcriptions`, per-request routing controls are documented as not
 * applied at all, so there is nothing to hand it. Either way the bascule has to
 * be ours to be observable and certain.
 */
export async function runModelChain<T>(
  chain: string[],
  attempt: (model: string) => Promise<T>,
  policy: RetryPolicy,
  hooks: RetryHooks = {},
): Promise<T> {
  let lastError: unknown;

  for (const [index, model] of chain.entries()) {
    try {
      return await withRetry(() => attempt(model), policy, hooks);
    } catch (error) {
      lastError = error;
      const isLastModel = index === chain.length - 1;
      const worthAnotherModel =
        isTransientFailure(error) || isModelUnavailable(error);
      if (isLastModel || !worthAnotherModel) throw error;
    }
  }

  throw lastError;
}

/** The models to try, in order, with no duplicate of the primary. */
export function buildChain(primary: string, fallbacks: string[]): string[] {
  return [primary, ...fallbacks.filter((model) => model !== primary)];
}

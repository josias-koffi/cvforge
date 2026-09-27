import { OpenRouterRequestError } from "./openrouter.error";

/**
 * A deadline on *opening* an OpenRouter call, never on the stream that follows.
 *
 * None of the three call sites had one. A voice turn budgeted at 1.2 s sat on a
 * stalled connection for 34 seconds (staging, 2026-09-21: `attempts: 2`,
 * `callMs: 34581`, no fallback) because `fetch` waits as long as the socket
 * stays open. The retry that followed answered in 1.3 s — the turn was never
 * hard, the first connection was simply dead and nothing said so.
 *
 * The timer is cleared the moment the response headers arrive, so the signal
 * can never fire mid-body. That distinction is the whole design: a voice reply
 * legitimately streams audio for a minute, and a blanket `AbortSignal.timeout`
 * would cut the interviewer off in mid-sentence.
 */

/**
 * Chat is not streamed for the report, so its headers wait on the full
 * completion — 1200 tokens of scored analysis. Deliberately far above anything
 * observed: the point is that "forever" stops being an option.
 */
export const CHAT_OPEN_TIMEOUT_MS = 90_000;

/**
 * Reported as 408 Request Timeout so it travels the paths that already exist:
 * `isRetryable` lists 408, so the chain retries a dead connection instead of
 * treating it as a permanent failure, and `failures` in the turn log names it.
 */
const TIMEOUT_STATUS = 408;

/**
 * `fetch`, with a deadline on the response headers.
 *
 * Returns the response untouched — callers read the body exactly as before, for
 * as long as they like.
 */
export async function fetchWithOpenTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  model: string | null = null,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    // Only our own timer aborts this controller, so an abort here can only be
    // the deadline: there is no caller-supplied signal to confuse it with.
    if (controller.signal.aborted) {
      throw new OpenRouterRequestError(
        `OpenRouter did not answer within ${timeoutMs}ms${model ? ` (${model})` : ""}`,
        TIMEOUT_STATUS,
        "",
        null,
        null,
        model,
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

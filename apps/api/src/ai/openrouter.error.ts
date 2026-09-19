/**
 * OpenRouter surfaces two very different kinds of 429: its own platform limits,
 * and an upstream provider throttling the shared credit pool (the common case
 * when no BYOK provider key is configured). Both are transient, so callers need
 * to tell them apart from a permanent 4xx before deciding to retry or give up.
 */

/** Statuses worth retrying: transient transport, throttling and gateway faults. */
const RETRYABLE_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const MAX_RETRY_AFTER_MS = 30_000;

export class OpenRouterRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail: string,
    readonly retryAfterMs: number | null,
    readonly providerName: string | null,
  ) {
    super(message);
    this.name = "OpenRouterRequestError";
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isRetryable(): boolean {
    return RETRYABLE_STATUSES.has(this.status);
  }
}

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status);
}

/**
 * Builds the error from a failed response, reading the body only once: the
 * caller cannot re-read it afterwards, so the raw text is kept in `detail`.
 */
export async function buildOpenRouterError(
  response: Response,
  operation: string,
): Promise<OpenRouterRequestError> {
  let detail = "";
  try {
    detail = await response.text();
  } catch {
    // A body that cannot be read must not hide the status code.
  }

  return new OpenRouterRequestError(
    `${operation}: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`,
    response.status,
    detail,
    parseRetryAfterMs(response.headers.get("Retry-After")),
    parseProviderName(detail),
  );
}

/** `Retry-After` is either a delay in seconds or an HTTP date. */
export function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;

  const seconds = Number(header.trim());
  if (Number.isFinite(seconds) && seconds >= 0) {
    return clampRetryAfter(seconds * 1000);
  }

  const retryAt = Date.parse(header);
  if (Number.isNaN(retryAt)) return null;

  return clampRetryAfter(retryAt - Date.now());
}

function clampRetryAfter(delayMs: number): number {
  return Math.min(Math.max(delayMs, 0), MAX_RETRY_AFTER_MS);
}

/** Best-effort read of `error.metadata.provider_name`, for logs and support. */
function parseProviderName(detail: string): string | null {
  if (!detail) return null;

  try {
    const parsed = JSON.parse(detail) as {
      error?: { metadata?: { provider_name?: unknown } };
    };
    const providerName = parsed.error?.metadata?.provider_name;
    return typeof providerName === "string" ? providerName : null;
  } catch {
    return null;
  }
}

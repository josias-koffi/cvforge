import { APICallError, NoContentGeneratedError } from "ai";

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
    /** Which model of the chain produced this, so logs name the culprit. */
    readonly model: string | null = null,
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
 * 404 means OpenRouter could route this model nowhere — no provider serves it,
 * or the account's allowed-providers setting filtered them all out. Retrying
 * the same model is pointless, but the next model of the chain may well be
 * reachable, so it must not abort the chain the way a malformed request does.
 */
export function isModelUnavailable(error: unknown): boolean {
  return error instanceof OpenRouterRequestError && error.status === 404;
}

/** Stands in for an HTTP status when no answer ever came back. */
const NO_RESPONSE_STATUS = 502;

/** A 200 with nothing in it: a refusal, or an upstream that gave up silently. */
const EMPTY_CONTENT_STATUS = 422;

export function buildEmptyContentError(model: string): OpenRouterRequestError {
  return new OpenRouterRequestError(
    `AI response contained no content (${model})`,
    EMPTY_CONTENT_STATUS,
    "",
    null,
    null,
    model,
  );
}

/**
 * Brings the SDK's errors back to the one the retry policy and the HTTP mapping
 * understand. A socket failure stays the `TypeError` that counts as transient.
 */
export function toLlmRequestError(error: unknown, model: string): unknown {
  if (NoContentGeneratedError.isInstance(error)) return buildEmptyContentError(model);
  if (!APICallError.isInstance(error)) return error;
  if (error.cause instanceof TypeError) return error.cause;

  // A 2xx the SDK refused to parse holds no usable answer, like an empty one.
  if (error.statusCode !== undefined && error.statusCode < 300) {
    return buildEmptyContentError(model);
  }

  const status = error.statusCode ?? NO_RESPONSE_STATUS;
  const detail = error.responseBody ?? "";

  return new OpenRouterRequestError(
    `AI request failed (${model}): ${status}${detail ? ` — ${detail}` : ""}`,
    status,
    detail,
    parseRetryAfterMs(error.responseHeaders?.["retry-after"] ?? null),
    parseProviderName(detail),
    model,
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

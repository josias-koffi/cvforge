import { SourceRateLimiter } from "../shared/rate-limit/source-rate-limiter";
import { FT_TOKEN_URL } from "./ft.config";

type FetchLike = typeof globalThis.fetch;

/** A token is refreshed a minute early, so a call never starts on a dead one. */
const TOKEN_SAFETY_MARGIN_MS = 60_000;
/** Used when the server leaves `expires_in` out: tokens live 25 minutes. */
const DEFAULT_TOKEN_TTL_MS = 25 * 60_000;
/** The token endpoint is shared by every API, so it gets its own pace. */
const TOKEN_REQUESTS_PER_SECOND = 2;
const DETAIL_MAX_CHARS = 200;

export interface FtCredentials {
  clientId: string;
  clientSecret: string;
  timeoutMs: number;
}

/**
 * France Travail refused to issue a token. `code` is their OAuth error
 * (`invalid_scope`, `invalid_client`…): an unsubscribed API and a wrong secret
 * are both a 400, and only this field tells them apart.
 */
export class FtTokenError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    readonly detail: string,
  ) {
    super(
      `France Travail refused the token (${status}${code ? `, ${code}` : ""}). ${detail}`.trim(),
    );
    this.name = "FtTokenError";
  }

  get isInvalidScope(): boolean {
    return this.code === "invalid_scope";
  }
}

/**
 * One access token **per scope**.
 *
 * Asking for every scope in a single token would make France Travail refuse
 * the whole request as soon as one API is not subscribed — one missing
 * subscription would take down all the others (ADR-024).
 */
export class FtTokenService {
  private readonly tokens = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  /** Concurrent callers of a same scope share one request in flight. */
  private readonly inFlight = new Map<string, Promise<string>>();

  constructor(
    private readonly credentials: FtCredentials,
    private readonly fetchImpl: FetchLike = globalThis.fetch,
    private readonly now: () => number = Date.now,
    private readonly limiter: SourceRateLimiter = new SourceRateLimiter({
      requestsPerSecond: TOKEN_REQUESTS_PER_SECOND,
    }),
  ) {}

  async accessToken(scope: string): Promise<string> {
    const cached = this.tokens.get(scope);
    if (cached && cached.expiresAt > this.now()) return cached.value;

    const pending = this.inFlight.get(scope);
    if (pending) return pending;

    const request = this.requestToken(scope).finally(() =>
      this.inFlight.delete(scope),
    );
    this.inFlight.set(scope, request);

    return request;
  }

  /** Forgets a token the API rejected (401), so the next call asks for a new one. */
  invalidate(scope: string): void {
    this.tokens.delete(scope);
  }

  private async requestToken(scope: string): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.credentials.clientId,
      client_secret: this.credentials.clientSecret,
      grant_type: "client_credentials",
      scope,
    });
    const response = await this.limiter.run(() =>
      this.fetchImpl(FT_TOKEN_URL, {
        body,
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
        signal: AbortSignal.timeout(this.credentials.timeoutMs),
      }),
    );

    if (!response.ok) throw await toTokenError(response);

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!payload.access_token) {
      throw new FtTokenError(
        response.status,
        null,
        "No access token in the response.",
      );
    }

    // Without `expires_in` the token would otherwise expire on arrival and
    // every single call would re-authenticate.
    const lifetimeMs = payload.expires_in
      ? payload.expires_in * 1000
      : DEFAULT_TOKEN_TTL_MS;
    this.tokens.set(scope, {
      expiresAt: this.now() + Math.max(0, lifetimeMs - TOKEN_SAFETY_MARGIN_MS),
      value: payload.access_token,
    });

    return payload.access_token;
  }
}

async function toTokenError(response: Response): Promise<FtTokenError> {
  const text = (await response.text().catch(() => "")).slice(
    0,
    DETAIL_MAX_CHARS,
  );
  let code: string | null = null;

  try {
    const parsed = JSON.parse(text) as { error?: unknown };
    code = typeof parsed.error === "string" ? parsed.error : null;
  } catch {
    // Not JSON: the raw text is kept as the detail.
  }

  return new FtTokenError(response.status, code, text);
}

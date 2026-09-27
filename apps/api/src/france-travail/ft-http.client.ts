import { Logger } from "@nestjs/common";
import {
  readRetryAfterMs,
  SourceRateLimiter,
} from "../shared/rate-limit/source-rate-limiter";
import {
  resolveFtConfig,
  type FtApiId,
  type FtConfig,
  type FtResolvedApi,
} from "./ft.config";
import { readDetail, readJson, unavailable, type FtResult } from "./ft-result";
import { FtTokenError, FtTokenService } from "./ft-token.service";

type FetchLike = typeof globalThis.fetch;

export interface FtRequest {
  method?: "GET" | "POST";
  /** Appended to the API's base URL, e.g. `/offres/search`. */
  path: string;
  /** Empty values are left out of the query string. */
  query?: Record<string, string | undefined>;
  body?: unknown;
  /** Defaults to 2: a call is retried once, the next run comes tomorrow. */
  attempts?: number;
}

const DEFAULT_ATTEMPTS = 2;
const DEFAULT_PAUSE_MS = 2_000;

/**
 * The only way CVForge talks to France Travail (ADR-024).
 *
 * One token per scope, one limiter per API — the quota of ROMEO must never be
 * spent by the offer collection, nor the other way round — and an API that is
 * not subscribed is never called at all.
 */
export class FtHttpClient {
  private readonly logger = new Logger(FtHttpClient.name);
  private readonly limiters = new Map<FtApiId, SourceRateLimiter>();
  /** Turned off by an `invalid_scope` until the process restarts. */
  private readonly unsubscribed = new Set<FtApiId>();

  constructor(
    private readonly config: FtConfig,
    private readonly fetchImpl: FetchLike = globalThis.fetch,
    private readonly now: () => number = Date.now,
    private readonly tokens: FtTokenService = new FtTokenService(
      config,
      fetchImpl,
      now,
    ),
    private readonly createLimiter: (
      requestsPerSecond: number,
    ) => SourceRateLimiter = (requestsPerSecond) =>
      new SourceRateLimiter({ requestsPerSecond }),
  ) {}

  api(id: FtApiId): FtResolvedApi {
    return this.config.apis[id];
  }

  isEnabled(id: FtApiId): boolean {
    return this.config.apis[id].enabled && !this.unsubscribed.has(id);
  }

  /** One boot-time line per API left inert, so a missing subscription is seen, not guessed. */
  warnAboutInertApis(): void {
    for (const name of this.config.unknownApis) {
      this.logger.warn(
        `FRANCE_TRAVAIL_APIS names "${name}", which is no known API: ignored.`,
      );
    }

    if (!this.config.hasCredentials) {
      this.logger.warn("France Travail: no credentials, every API is inert.");
      return;
    }

    const inert = Object.values(this.config.apis).filter((api) => !api.enabled);

    if (inert.length > 0) {
      this.logger.warn(
        `France Travail: inert until listed in FRANCE_TRAVAIL_APIS — ${inert.map((api) => api.id).join(", ")}.`,
      );
    }
  }

  async request<T>(id: FtApiId, request: FtRequest): Promise<FtResult<T>> {
    if (!this.isEnabled(id)) {
      return unavailable("disabled", null, `${id} is not enabled.`);
    }

    const api = this.config.apis[id];
    const url = buildUrl(api.baseUrl, request);
    const attempts = Math.max(1, request.attempts ?? DEFAULT_ATTEMPTS);
    let failure: FtResult<T> = unavailable("network", null, "No attempt made.");

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      let token: string;

      try {
        token = await this.tokens.accessToken(api.scope);
      } catch (error) {
        const refusal = this.readTokenFailure<T>(id, error);
        if (refusal.retry) {
          failure = refusal.result;
          continue;
        }
        return refusal.result;
      }

      let response: Response;

      try {
        response = await this.limiterFor(api).run(() =>
          this.fetchImpl(url, this.init(request, token)),
        );
      } catch (error) {
        failure = unavailable("network", null, String(error));
        continue;
      }

      // 204: nothing matches. 404: the resource is gone. Both are answers.
      if (response.status === 204 || response.status === 404) {
        return { kind: "empty", status: response.status };
      }

      // 206 is the normal answer to a `range`: a success.
      if (response.ok || response.status === 206) return readJson<T>(response);

      // 403 is how an API that issued a token but is not granted to this
      // application answers: a scope missing from the token, or a wrong path.
      if (response.status === 403) {
        return this.markUnsubscribed(id, 403, await readDetail(response));
      }

      if (response.status === 401) {
        this.tokens.invalidate(api.scope);
        failure = unavailable("auth", 401, await readDetail(response));
        continue;
      }

      if (response.status === 429 || response.status >= 500) {
        this.pauseFrom(api, response);
        failure = unavailable(
          "throttled",
          response.status,
          await readDetail(response),
        );
        continue;
      }

      // Their body names the rejected parameter; without it every bad query
      // looks the same and the fix is guesswork.
      return unavailable(
        "rejected",
        response.status,
        await readDetail(response),
      );
    }

    return failure;
  }

  private readTokenFailure<T>(
    id: FtApiId,
    error: unknown,
  ): { retry: boolean; result: FtResult<T> } {
    if (!(error instanceof FtTokenError)) {
      return {
        result: unavailable("network", null, String(error)),
        retry: true,
      };
    }

    if (error.isInvalidScope) {
      return {
        result: this.markUnsubscribed(id, error.status, error.detail),
        retry: false,
      };
    }

    return {
      result: unavailable("auth", error.status, error.message),
      retry: error.status >= 500,
    };
  }

  /** Off until restart: every later call would be refused the same way. */
  private markUnsubscribed<T>(
    id: FtApiId,
    status: number,
    detail: string,
  ): FtResult<T> {
    this.unsubscribed.add(id);
    this.logger.warn(
      `France Travail: ${id} refused (${status}, scope "${this.config.apis[id].scope}") — not subscribed or not granted on francetravail.io; off until restart. ${detail}`.trim(),
    );

    return unavailable("unsubscribed", status, detail);
  }

  private init(request: FtRequest, token: string): RequestInit {
    const headers: Record<string, string> = {
      accept: "application/json",
      authorization: `Bearer ${token}`,
    };

    if (request.body !== undefined)
      headers["content-type"] = "application/json";

    return {
      body:
        request.body === undefined ? undefined : JSON.stringify(request.body),
      headers,
      method: request.method ?? "GET",
      signal: AbortSignal.timeout(this.config.timeoutMs),
    };
  }

  private limiterFor(api: FtResolvedApi): SourceRateLimiter {
    let limiter = this.limiters.get(api.id);

    if (!limiter) {
      limiter = this.createLimiter(api.requestsPerSecond);
      this.limiters.set(api.id, limiter);
    }

    return limiter;
  }

  /** The API told us its pace; arguing with it only earns a longer ban. */
  private pauseFrom(api: FtResolvedApi, response: Response): void {
    const pauseMs = readRetryAfterMs(
      response.headers.get("retry-after"),
      DEFAULT_PAUSE_MS,
      this.now(),
    );
    this.limiterFor(api).pauseUntil(this.now() + pauseMs);
  }
}

/** The process-wide client: one token cache and one limiter set for every caller. */
export function createFtHttpClient(
  env: NodeJS.ProcessEnv = process.env,
): FtHttpClient {
  const client = new FtHttpClient(resolveFtConfig(env));
  client.warnAboutInertApis();

  return client;
}

function buildUrl(baseUrl: string, request: FtRequest): string {
  const url = new URL(`${baseUrl}${request.path}`);

  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value) url.searchParams.set(key, value);
  }

  return url.toString();
}

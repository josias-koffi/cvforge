import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type NestMiddleware,
} from "@nestjs/common";
import { DAY_MS, resolveRateLimitConfig, type RateLimitConfig } from "./rate-limit.config";
import {
  RATE_LIMIT_CLOCK,
  RATE_LIMIT_STORE,
  type Clock,
  type RateLimitRule,
  type RateLimitStore,
} from "./rate-limit.types";

/** The shared counter every request charges against, whatever its origin. */
const GLOBAL_KEY = "global:ats-scan";
const UNKNOWN_IP = "unknown";

export const RATE_LIMITED_MESSAGE =
  "Trop d'analyses demandees depuis cette adresse. Reessayez plus tard.";
export const BUDGET_EXHAUSTED_MESSAGE =
  "L'analyse gratuite est momentanement indisponible. Reessayez demain.";

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  originalUrl?: string;
  url?: string;
  socket?: { remoteAddress?: string };
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
};

/**
 * Protects the unauthenticated scan route, which is the first public AI surface
 * of the product: an upload, a parse and a model call, none of it behind a
 * session.
 *
 * Written by hand rather than with `@nestjs/throttler`, which is Guard-based
 * while this codebase deliberately uses none — every handler goes through
 * `requireSession` instead (ADR-022).
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly config: RateLimitConfig;

  constructor(
    @Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore,
    // A token, not a defaulted parameter: tests advance time instead of waiting
    // for it, and Nest still has something to resolve.
    @Inject(RATE_LIMIT_CLOCK) private readonly now: Clock,
  ) {
    this.config = resolveRateLimitConfig();
  }

  use(request: RequestLike, response: ResponseLike, next: () => void) {
    const now = this.now();

    // Opportunistic: the longest window is a day, so anything older is dead
    // weight no rule will ever read again.
    this.store.prune(now - DAY_MS);

    const unlocking = isUnlock(request);

    // The budget exists to stop *spending*, and unlocking spends nothing — it
    // returns a report already computed. Charging it here would strand a
    // visitor holding a scan they cannot open.
    if (!unlocking) {
      const budget = this.config.dailyBudget;

      if (this.store.count(GLOBAL_KEY, budget.windowMs, now) >= budget.limit) {
        this.reject(
          response,
          GLOBAL_KEY,
          budget,
          now,
          HttpStatus.SERVICE_UNAVAILABLE,
          BUDGET_EXHAUSTED_MESSAGE,
        );
      }
    }

    // Separate keys, not just separate limits: scans must not eat into the
    // unlock allowance either.
    const key = `${unlocking ? "unlock" : "scan"}:${clientIp(request)}`;
    const rules = unlocking ? this.config.unlockPerIp : this.config.perIp;

    for (const rule of rules) {
      if (this.store.count(key, rule.windowMs, now) >= rule.limit) {
        this.reject(
          response,
          key,
          rule,
          now,
          HttpStatus.TOO_MANY_REQUESTS,
          RATE_LIMITED_MESSAGE,
        );
      }
    }

    // Recorded only once every rule passed: a rejected request must not push
    // its own window forward, or a client hammering the route would never come
    // back under the limit.
    this.store.record(key, now);

    if (!unlocking) {
      this.store.record(GLOBAL_KEY, now);
    }

    next();
  }

  private reject(
    response: ResponseLike,
    key: string,
    rule: RateLimitRule,
    now: number,
    status: HttpStatus,
    message: string,
  ): never {
    response.setHeader(
      "Retry-After",
      String(this.retryAfterSeconds(key, rule, now)),
    );

    throw new HttpException(message, status);
  }

  /** When the oldest hit leaves the window, which is when a slot frees up. */
  private retryAfterSeconds(key: string, rule: RateLimitRule, now: number) {
    const oldest = this.store.oldestHit(key, rule.windowMs, now);

    if (oldest === null) return Math.ceil(rule.windowMs / 1000);

    return Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000));
  }
}

/**
 * Which of the two public routes this is.
 *
 * They are metered apart because they cost wildly different things: a scan
 * parses a file and calls a model, an unlock reads a row back.
 */
function isUnlock(request: RequestLike) {
  const path = (request.originalUrl ?? request.url ?? "").split("?")[0] ?? "";

  return path.endsWith("/unlock");
}

/**
 * The first hop of `X-Forwarded-For` is the client; the rest are the proxies it
 * passed through. Express only populates `request.ip` from that header when
 * `trust proxy` is set, so both are consulted.
 *
 * An unidentifiable caller shares one bucket rather than bypassing the limit:
 * the global budget still bounds the damage either way.
 */
export function clientIp(request: RequestLike): string {
  const forwarded = request.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const firstHop = raw?.split(",")[0]?.trim();

  return (
    firstHop ||
    request.ip ||
    request.socket?.remoteAddress ||
    UNKNOWN_IP
  );
}

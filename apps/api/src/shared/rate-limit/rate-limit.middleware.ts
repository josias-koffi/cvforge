import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  type NestMiddleware,
} from "@nestjs/common";
import { publicError } from "@cvforge/types";
import { clientIp } from "./client-ip";
import { DAY_MS } from "./rate-limit.config";
import { resolveRateLimitPolicies } from "./rate-limit.policies";
import {
  RATE_LIMIT_CLOCK,
  RATE_LIMIT_STORE,
  type Clock,
  type RateLimitPolicy,
  type RateLimitRule,
  type RateLimitStore,
} from "./rate-limit.types";

export { clientIp } from "./client-ip";
export {
  BUDGET_EXHAUSTED_MESSAGE,
  RATE_LIMITED_MESSAGE,
} from "./rate-limit.policies";

/**
 * Set on a request once it has been counted. Nest applies the middleware once
 * per declared route the path matches, and `public/ats-scan/{*splat}` and
 * `public/ats-scan` both match `/public/ats-scan/…/unlock`: without this mark
 * every lead and unlock request spent two of its caller's allowance.
 */
const METERED = Symbol("rateLimitMetered");

type RequestLike = {
  [METERED]?: true;
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
 * Meters the unauthenticated public routes, each by its own policy
 * (`rate-limit.policies.ts`): per-IP windows, and a global daily budget for
 * the routes that spend something.
 *
 * Written by hand rather than with `@nestjs/throttler`, which is Guard-based
 * while this codebase deliberately uses none — every handler goes through
 * `requireSession` instead (ADR-022).
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly policies: RateLimitPolicy[];

  constructor(
    @Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore,
    // A token, not a defaulted parameter: tests advance time instead of waiting
    // for it, and Nest still has something to resolve.
    @Inject(RATE_LIMIT_CLOCK) private readonly now: Clock,
  ) {
    this.policies = resolveRateLimitPolicies();
  }

  use(request: RequestLike, response: ResponseLike, next: () => void) {
    if (request[METERED]) {
      next();
      return;
    }

    const now = this.now();

    // Opportunistic: the longest window is a day, so anything older is dead
    // weight no rule will ever read again.
    this.store.prune(now - DAY_MS);

    const policy = this.policyFor(request);
    const budget = policy.globalBudget;

    if (
      budget &&
      this.store.count(budget.key, budget.rule.windowMs, now) >=
        budget.rule.limit
    ) {
      this.reject(
        response,
        budget.key,
        budget.rule,
        now,
        HttpStatus.SERVICE_UNAVAILABLE,
        policy.budgetMessage,
      );
    }

    // One key per policy, not just separate limits: scans must not eat into
    // the unlock allowance, nor funnel events into either.
    const key = `${policy.name}:${clientIp(request)}`;

    for (const rule of policy.perIp) {
      if (this.store.count(key, rule.windowMs, now) >= rule.limit) {
        this.reject(
          response,
          key,
          rule,
          now,
          HttpStatus.TOO_MANY_REQUESTS,
          policy.limitedMessage,
        );
      }
    }

    // Recorded only once every rule passed: a rejected request must not push
    // its own window forward, or a client hammering the route would never come
    // back under the limit.
    this.store.record(key, now);
    request[METERED] = true;

    if (budget) {
      this.store.record(budget.key, now);
    }

    next();
  }

  /**
   * The first policy that claims the path. Never undefined: the last policy,
   * the ATS scan, claims every path (asserted in `rate-limit.policies.test.ts`).
   */
  private policyFor(request: RequestLike) {
    const path = (request.originalUrl ?? request.url ?? "").split("?")[0] ?? "";

    return this.policies.find((policy) => policy.matches(path))!;
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

    // A code the landing translates, since the message is French (US-134).
    const code =
      status === HttpStatus.SERVICE_UNAVAILABLE
        ? "BUDGET_EXHAUSTED"
        : "RATE_LIMITED";

    throw new HttpException(publicError(code, message), status);
  }

  /** When the oldest hit leaves the window, which is when a slot frees up. */
  private retryAfterSeconds(key: string, rule: RateLimitRule, now: number) {
    const oldest = this.store.oldestHit(key, rule.windowMs, now);

    if (oldest === null) return Math.ceil(rule.windowMs / 1000);

    return Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000));
  }
}

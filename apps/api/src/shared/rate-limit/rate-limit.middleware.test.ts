import { HttpException, HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DAY_MS, HOUR_MS } from "./rate-limit.config";
import { MemoryRateLimitStore } from "./rate-limit.memory-store";
import { RateLimitMiddleware } from "./rate-limit.middleware";

const START = 1_700_000_000_000;

describe("RateLimitMiddleware", () => {
  let clock: number;
  let store: MemoryRateLimitStore;
  let middleware: RateLimitMiddleware;
  let next: ReturnType<typeof vi.fn>;
  let response: { setHeader: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // The env drives the config, and these tests assert the documented defaults.
    delete process.env.ATS_PUBLIC_HOURLY_LIMIT;
    delete process.env.ATS_PUBLIC_DAILY_LIMIT;
    delete process.env.ATS_PUBLIC_DAILY_BUDGET;

    clock = START;
    store = new MemoryRateLimitStore();
    middleware = new RateLimitMiddleware(store, () => clock);
    next = vi.fn();
    response = { setHeader: vi.fn() };
  });

  function request(ip = "203.0.113.7") {
    return { headers: { "x-forwarded-for": ip } };
  }

  /** Time is injected, never waited on. */
  function advance(ms: number) {
    clock += ms;
  }

  function call(ip?: string) {
    middleware.use(request(ip), response, next);
  }

  function callAndCatch(ip?: string) {
    try {
      call(ip);
      return null;
    } catch (error) {
      return error as HttpException;
    }
  }

  describe("the hourly window", () => {
    it("lets the allowance through", () => {
      call();
      call();
      call();

      expect(next).toHaveBeenCalledTimes(3);
    });

    it("answers 429 once the allowance is spent", () => {
      call();
      call();
      call();

      const error = callAndCatch();

      expect(error?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(next).toHaveBeenCalledTimes(3);
    });

    it("sets Retry-After to when the oldest hit leaves the window", () => {
      call();
      advance(10 * 60 * 1000);
      call();
      call();

      callAndCatch();

      const [, seconds] = response.setHeader.mock.calls.at(-1) as [
        string,
        string,
      ];

      expect(response.setHeader).toHaveBeenLastCalledWith(
        "Retry-After",
        expect.any(String),
      );
      // The first hit was 10 minutes ago, so a slot frees in ~50.
      expect(Number(seconds)).toBeGreaterThan(49 * 60);
      expect(Number(seconds)).toBeLessThanOrEqual(50 * 60);
    });

    it("frees a slot as the window slides", () => {
      call();
      call();
      call();
      advance(HOUR_MS + 1000);

      expect(callAndCatch()).toBeNull();
    });

    /**
     * A rejected request must not extend its own window, or a client hammering
     * the route would never come back under the limit.
     */
    it("does not count rejected requests against the window", () => {
      call();
      call();
      call();
      advance(30 * 60 * 1000);
      callAndCatch();
      callAndCatch();
      advance(HOUR_MS - 30 * 60 * 1000 + 1000);

      expect(callAndCatch()).toBeNull();
    });
  });

  describe("the daily window", () => {
    it("stops a client that spreads its requests across the day", () => {
      for (let hour = 0; hour < 10; hour++) {
        call();
        advance(HOUR_MS + 1000);
      }

      const error = callAndCatch();

      expect(error?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(next).toHaveBeenCalledTimes(10);
    });

    it("lets the client back in the next day", () => {
      for (let hour = 0; hour < 10; hour++) {
        call();
        advance(HOUR_MS + 1000);
      }
      advance(DAY_MS);

      expect(callAndCatch()).toBeNull();
    });
  });

  describe("isolation between callers", () => {
    it("keeps one client's limit from touching another's", () => {
      call("203.0.113.7");
      call("203.0.113.7");
      call("203.0.113.7");

      expect(callAndCatch("198.51.100.4")).toBeNull();
    });

    it("reads the client from the first hop of X-Forwarded-For", () => {
      // A fresh object per call, as each HTTP request is: the middleware
      // marks a request it has counted.
      const proxied = () => ({
        headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" },
      });

      middleware.use(proxied(), response, next);
      middleware.use(proxied(), response, next);
      middleware.use(proxied(), response, next);

      expect(() => middleware.use(proxied(), response, next)).toThrow(
        HttpException,
      );
      // Same first hop, different proxy chain: still the same client.
      expect(() =>
        middleware.use(
          { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } },
          response,
          next,
        ),
      ).toThrow(HttpException);
    });

    it("falls back to the socket address when no header is present", () => {
      const direct = { headers: {}, socket: { remoteAddress: "203.0.113.9" } };

      middleware.use(direct, response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(() =>
        middleware.use({ headers: {}, socket: { remoteAddress: "198.51.100.1" } }, response, next),
      ).not.toThrow();
    });

    /** Unidentifiable callers share a bucket rather than bypassing the limit. */
    it("does not let an unidentifiable caller through unlimited", () => {
      const anonymous = () => ({ headers: {} });

      middleware.use(anonymous(), response, next);
      middleware.use(anonymous(), response, next);
      middleware.use(anonymous(), response, next);

      expect(() => middleware.use(anonymous(), response, next)).toThrow(
        HttpException,
      );
    });
  });

  describe("the global daily budget", () => {
    /** The real stop-loss: per-IP limits alone do not survive a botnet. */
    it("answers 503 once the day's budget is spent, whatever the origin", () => {
      process.env.ATS_PUBLIC_DAILY_BUDGET = "2";
      middleware = new RateLimitMiddleware(store, () => clock);

      call("203.0.113.1");
      call("203.0.113.2");

      const error = callAndCatch("203.0.113.3");

      expect(error?.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it("is checked before the per-IP rules", () => {
      process.env.ATS_PUBLIC_DAILY_BUDGET = "1";
      middleware = new RateLimitMiddleware(store, () => clock);

      call("203.0.113.1");

      // A fresh IP, well within its own allowance, still hits the budget.
      expect(callAndCatch("203.0.113.2")?.getStatus()).toBe(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    });

    it("refills the budget the next day", () => {
      process.env.ATS_PUBLIC_DAILY_BUDGET = "1";
      middleware = new RateLimitMiddleware(store, () => clock);

      call("203.0.113.1");
      advance(DAY_MS + 1000);

      expect(callAndCatch("203.0.113.2")).toBeNull();
    });
  });

  /**
   * Found by running the funnel end to end: unlocking shared the scan
   * allowance, so a visitor who analysed their three CVs could not open any of
   * their reports for an hour — the anti-cost guard blocking the very
   * conversion the page exists for.
   */
  describe("unlocking is metered apart from scanning", () => {
    function unlock(ip = "203.0.113.7") {
      middleware.use(
        { headers: { "x-forwarded-for": ip }, url: `/public/ats-scan/abc/unlock` },
        response,
        next,
      );
    }

    function unlockAndCatch(ip?: string) {
      try {
        unlock(ip);
        return null;
      } catch (error) {
        return error as HttpException;
      }
    }

    it("lets a visitor who spent their scan allowance still unlock", () => {
      call();
      call();
      call();

      expect(unlockAndCatch()).toBeNull();
    });

    it("does not let unlocking eat into the scan allowance either", () => {
      unlock();
      unlock();
      unlock();
      unlock();

      expect(callAndCatch()).toBeNull();
    });

    it("still caps unlocking, because it sends an email", () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        unlock()
      }

      expect(unlockAndCatch()?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    /** An exhausted budget must not strand a visitor holding a scan. */
    it("lets a visitor unlock even once the day's budget is spent", () => {
      process.env.ATS_PUBLIC_DAILY_BUDGET = "1";
      middleware = new RateLimitMiddleware(store, () => clock);

      call("203.0.113.1");
      expect(callAndCatch("203.0.113.2")?.getStatus()).toBe(
        HttpStatus.SERVICE_UNAVAILABLE,
      );

      expect(unlockAndCatch("203.0.113.2")).toBeNull();
    });

    it("does not charge an unlock against the global budget", () => {
      process.env.ATS_PUBLIC_DAILY_BUDGET = "2";
      middleware = new RateLimitMiddleware(store, () => clock);

      unlock("203.0.113.1");
      unlock("203.0.113.2");
      unlock("203.0.113.3");

      // The budget is untouched, so a scan still gets through.
      expect(callAndCatch("203.0.113.4")).toBeNull();
    });

    it("ignores a query string when reading the path", () => {
      middleware.use(
        {
          headers: { "x-forwarded-for": "203.0.113.9" },
          url: "/public/ats-scan/abc/unlock?from=email",
        },
        response,
        next,
      );

      expect(next).toHaveBeenCalled();
    });
  });

  /** Nest runs it once per declared route that matches the path. */
  describe("a request that matches two declared routes", () => {
    it("is counted once", () => {
      const unlock = {
        headers: { "x-forwarded-for": "203.0.113.9" },
        url: "/public/ats-scan/abc/unlock",
      };

      middleware.use(unlock, response, next);
      middleware.use(unlock, response, next);

      expect(next).toHaveBeenCalledTimes(2);
      expect(store.count("unlock:203.0.113.9", DAY_MS, clock)).toBe(1);
    });

    it("still meters the next request", () => {
      call();
      call();

      expect(store.count("scan:203.0.113.7", DAY_MS, clock)).toBe(2);
    });
  });

  describe("memory", () => {
    it("drops hits older than the longest window", () => {
      call();
      advance(DAY_MS + 1000);
      call();

      expect(store.count("scan:203.0.113.7", DAY_MS, clock)).toBe(1);
    });
  });
});

import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { MemoryRateLimitStore } from "./rate-limit.memory-store";
import { RateLimitMiddleware } from "./rate-limit.middleware";
import { RateLimitModule } from "./rate-limit.module";
import {
  RATE_LIMIT_CLOCK,
  RATE_LIMIT_STORE,
  type Clock,
} from "./rate-limit.types";

type Provider = {
  provide?: symbol;
  useValue?: unknown;
  useFactory?: () => unknown;
};

function providersOf() {
  return (Reflect.getMetadata("providers", RateLimitModule) ?? []) as Array<
    Provider | typeof RateLimitMiddleware
  >;
}

function providerFor(token: symbol) {
  return providersOf().find(
    (provider): provider is Provider =>
      typeof provider === "object" && provider.provide === token,
  );
}

describe("RateLimitModule", () => {
  /**
   * `AppModule` is what applies the middleware, and Nest instantiates it there
   * — so these tokens must be exported or the container refuses to boot.
   */
  it("exports what the applying module needs to resolve", () => {
    const exported = Reflect.getMetadata("exports", RateLimitModule) as
      | unknown[]
      | undefined;

    expect(exported).toContain(RATE_LIMIT_STORE);
    expect(exported).toContain(RATE_LIMIT_CLOCK);
    expect(exported).toContain(RateLimitMiddleware);
  });

  it("provides the in-memory store", () => {
    const store = providerFor(RATE_LIMIT_STORE)?.useFactory?.();

    expect(store).toBeInstanceOf(MemoryRateLimitStore);
  });

  it("provides a clock reading real time", () => {
    const clock = providerFor(RATE_LIMIT_CLOCK)?.useValue as Clock;

    const before = Date.now();
    const reading = clock();

    expect(reading).toBeGreaterThanOrEqual(before);
    expect(reading).toBeLessThanOrEqual(Date.now());
  });
});

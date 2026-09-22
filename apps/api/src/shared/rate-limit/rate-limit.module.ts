import { Module } from "@nestjs/common";
import { MemoryRateLimitStore } from "./rate-limit.memory-store";
import { RateLimitMiddleware } from "./rate-limit.middleware";
import { RATE_LIMIT_CLOCK, RATE_LIMIT_STORE } from "./rate-limit.types";

/**
 * Holds the one counter store the middleware charges against.
 *
 * Exported because Nest instantiates middleware in the module that *applies*
 * it — `AppModule` — which must therefore be able to resolve these tokens.
 */
@Module({
  exports: [RATE_LIMIT_CLOCK, RATE_LIMIT_STORE, RateLimitMiddleware],
  providers: [
    RateLimitMiddleware,
    { provide: RATE_LIMIT_CLOCK, useValue: () => Date.now() },
    { provide: RATE_LIMIT_STORE, useFactory: () => new MemoryRateLimitStore() },
  ],
})
export class RateLimitModule {}

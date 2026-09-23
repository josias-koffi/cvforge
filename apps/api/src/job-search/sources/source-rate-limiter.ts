/** Moved to `shared/rate-limit/` (US-122): France Travail uses it outside job search. */
export {
  readRetryAfterMs,
  SourceRateLimiter,
  type RateLimiterOptions,
} from "../../shared/rate-limit/source-rate-limiter";

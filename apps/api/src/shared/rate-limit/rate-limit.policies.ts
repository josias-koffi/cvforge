import {
  DAY_MS,
  HOUR_MS,
  readPositiveInt,
  resolveRateLimitConfig,
} from "./rate-limit.config";
import type { RateLimitPolicy } from "./rate-limit.types";

export const RATE_LIMITED_MESSAGE =
  "Trop d'analyses demandees depuis cette adresse. Reessayez plus tard.";
export const BUDGET_EXHAUSTED_MESSAGE =
  "L'analyse gratuite est momentanement indisponible. Reessayez demain.";
export const EVENTS_REJECTED_MESSAGE =
  "Trop d'evenements. Reessayez plus tard.";

const DEFAULT_EVENTS_HOURLY_LIMIT = 60;
const DEFAULT_EVENTS_DAILY_LIMIT = 300;
const DEFAULT_EVENTS_DAILY_BUDGET = 20_000;
const DEFAULT_KEYWORD_MATCH_HOURLY_LIMIT = 10;
const DEFAULT_KEYWORD_MATCH_DAILY_LIMIT = 30;
const DEFAULT_KEYWORD_MATCH_DAILY_BUDGET = 2_000;
const DEFAULT_KEYWORD_MATCH_LEAD_HOURLY_LIMIT = 5;
const DEFAULT_KEYWORD_MATCH_LEAD_DAILY_LIMIT = 20;

export const KEYWORD_MATCH_UNAVAILABLE_MESSAGE =
  "Le comparateur gratuit est momentanement indisponible. Reessayez demain.";

/**
 * Every rate-limited public route, most specific first. Adding a route means
 * adding a policy here: `AppModule` applies the middleware to the routes
 * declared below, and nothing else has to change.
 *
 * The last policy, the ATS scan, is the default: it is the strictest, so a
 * route wired without a policy of its own is throttled hard rather than let
 * through (US-132, ADR-022).
 */
export function resolveRateLimitPolicies(
  env: NodeJS.ProcessEnv = process.env,
): RateLimitPolicy[] {
  const ats = resolveRateLimitConfig(env);

  return [
    {
      budgetMessage: EVENTS_REJECTED_MESSAGE,
      // A cap on rows, not on spending: the funnel only loses a few counts.
      globalBudget: {
        key: "global:events",
        rule: {
          limit: readPositiveInt(
            env.PUBLIC_EVENTS_DAILY_BUDGET,
            DEFAULT_EVENTS_DAILY_BUDGET,
          ),
          windowMs: DAY_MS,
        },
      },
      limitedMessage: EVENTS_REJECTED_MESSAGE,
      // Case-insensitive like Express routing, or `/Public/Events` would fall
      // through to the scan policy and spend the ATS budget.
      matches: (path) => /\/public\/events\/?$/i.test(path),
      name: "events",
      perIp: [
        {
          limit: readPositiveInt(
            env.PUBLIC_EVENTS_HOURLY_LIMIT,
            DEFAULT_EVENTS_HOURLY_LIMIT,
          ),
          windowMs: HOUR_MS,
        },
        {
          limit: readPositiveInt(
            env.PUBLIC_EVENTS_DAILY_LIMIT,
            DEFAULT_EVENTS_DAILY_LIMIT,
          ),
          windowMs: DAY_MS,
        },
      ],
      routes: ["public/events"],
    },
    {
      budgetMessage: KEYWORD_MATCH_UNAVAILABLE_MESSAGE,
      // Sends a magic link, so it is capped per address like the ATS unlock;
      // it spends nothing until the link is redeemed (US-136).
      globalBudget: null,
      limitedMessage: RATE_LIMITED_MESSAGE,
      matches: (path) => /\/public\/keyword-match\/lead\/?$/i.test(path),
      name: "keyword-match-lead",
      perIp: perIpRules(
        env.PUBLIC_KEYWORD_MATCH_LEAD_HOURLY_LIMIT,
        DEFAULT_KEYWORD_MATCH_LEAD_HOURLY_LIMIT,
        env.PUBLIC_KEYWORD_MATCH_LEAD_DAILY_LIMIT,
        DEFAULT_KEYWORD_MATCH_LEAD_DAILY_LIMIT,
      ),
      routes: ["public/keyword-match/{*splat}"],
    },
    {
      budgetMessage: KEYWORD_MATCH_UNAVAILABLE_MESSAGE,
      // No model call, but parsing a PDF costs CPU on the API process: the
      // budget caps that, far above what real visitors need.
      globalBudget: {
        key: "global:keyword-match",
        rule: {
          limit: readPositiveInt(
            env.PUBLIC_KEYWORD_MATCH_DAILY_BUDGET,
            DEFAULT_KEYWORD_MATCH_DAILY_BUDGET,
          ),
          windowMs: DAY_MS,
        },
      },
      limitedMessage: RATE_LIMITED_MESSAGE,
      matches: (path) => /\/public\/keyword-match\/?$/i.test(path),
      name: "keyword-match",
      perIp: perIpRules(
        env.PUBLIC_KEYWORD_MATCH_HOURLY_LIMIT,
        DEFAULT_KEYWORD_MATCH_HOURLY_LIMIT,
        env.PUBLIC_KEYWORD_MATCH_DAILY_LIMIT,
        DEFAULT_KEYWORD_MATCH_DAILY_LIMIT,
      ),
      routes: ["public/keyword-match"],
    },
    {
      budgetMessage: BUDGET_EXHAUSTED_MESSAGE,
      // Unlocking hands back a report already computed: it spends nothing,
      // and charging the budget would strand a visitor holding a scan.
      globalBudget: null,
      limitedMessage: RATE_LIMITED_MESSAGE,
      matches: (path) => /\/unlock\/?$/i.test(path),
      name: "unlock",
      perIp: ats.unlockPerIp,
      routes: ["public/ats-scan/{*splat}"],
    },
    {
      budgetMessage: BUDGET_EXHAUSTED_MESSAGE,
      globalBudget: { key: "global:ats-scan", rule: ats.dailyBudget },
      limitedMessage: RATE_LIMITED_MESSAGE,
      matches: () => true,
      name: "scan",
      perIp: ats.perIp,
      routes: ["public/ats-scan"],
    },
  ];
}

/** The routes `AppModule` applies the middleware to, each once. */
export function rateLimitedRoutes(policies = resolveRateLimitPolicies()) {
  return [...new Set(policies.flatMap((policy) => policy.routes))];
}

/** An hourly and a daily allowance per address, each overridable by env. */
function perIpRules(
  hourly: string | undefined,
  hourlyDefault: number,
  daily: string | undefined,
  dailyDefault: number,
) {
  return [
    { limit: readPositiveInt(hourly, hourlyDefault), windowMs: HOUR_MS },
    { limit: readPositiveInt(daily, dailyDefault), windowMs: DAY_MS },
  ];
}

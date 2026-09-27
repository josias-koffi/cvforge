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

export const JOB_MARKET_UNAVAILABLE_MESSAGE =
  "L'outil marche de l'emploi est momentanement indisponible. Reessayez demain.";
export const KEYWORD_MATCH_UNAVAILABLE_MESSAGE =
  "Le comparateur gratuit est momentanement indisponible. Reessayez demain.";
export const COMPANY_CHECK_UNAVAILABLE_MESSAGE =
  "La verification d'employeur est momentanement indisponible. Reessayez demain.";
export const INTERVIEW_QUESTIONS_UNAVAILABLE_MESSAGE =
  "Les questions d'entretien gratuites sont momentanement indisponibles. Reessayez demain.";

/** The lead routes send a magic link: 5 an hour and 20 a day per address. */
const LEAD_LIMITS = { daily: 20, hourly: 5 };

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
    // No model call, but parsing a PDF costs CPU on the API process: the
    // budget caps that, far above what real visitors need (US-136).
    ...freeToolPolicies(env, {
      envPrefix: "PUBLIC_KEYWORD_MATCH",
      limits: { budget: 2_000, daily: 30, hourly: 10 },
      message: KEYWORD_MATCH_UNAVAILABLE_MESSAGE,
      name: "keyword-match",
      reads: /\/public\/keyword-match\/?$/i,
    }),
    // Reads of our own copies, the autocomplete included, so the per-address
    // allowance is wide. The budget caps the database reads and the pairs a
    // crowd could queue for the monthly refresh (US-137).
    ...freeToolPolicies(env, {
      envPrefix: "PUBLIC_JOB_MARKET",
      limits: { budget: 50_000, daily: 600, hourly: 120 },
      message: JOB_MARKET_UNAVAILABLE_MESSAGE,
      name: "job-market",
      reads: /\/public\/job-market(\/appellations)?\/?$/i,
    }),
    // Each search or record is a call to the Annuaire des entreprises, which
    // tolerates about 5 a second per server address: the budget keeps a
    // crowd from starving the hourly company refresh (US-139).
    ...freeToolPolicies(env, {
      envPrefix: "PUBLIC_COMPANY_CHECK",
      limits: { budget: 10_000, daily: 300, hourly: 60 },
      message: COMPANY_CHECK_UNAVAILABLE_MESSAGE,
      name: "company-check",
      reads: /\/public\/company-check(\/\d{9})?\/?$/i,
    }),
    // The one free tool that calls a model (US-141): per-address limits as
    // strict as the ATS scan's, and a budget that caps the day's bill.
    ...freeToolPolicies(env, {
      envPrefix: "PUBLIC_INTERVIEW_QUESTIONS",
      limits: { budget: 300, daily: 10, hourly: 3 },
      message: INTERVIEW_QUESTIONS_UNAVAILABLE_MESSAGE,
      name: "interview-questions",
      reads: /\/public\/interview-questions\/?$/i,
    }),
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

/**
 * A free tool's two policies: its lead route, capped per address since it
 * sends mail and spends nothing else, then its reads, under a global budget.
 * Every limit is overridable by `${envPrefix}_[LEAD_]HOURLY_LIMIT`,
 * `_DAILY_LIMIT` and `${envPrefix}_DAILY_BUDGET`.
 */
function freeToolPolicies(
  env: NodeJS.ProcessEnv,
  tool: {
    name: string;
    envPrefix: string;
    message: string;
    /** The read paths; the lead path is matched before them. */
    reads: RegExp;
    limits: { hourly: number; daily: number; budget: number };
  },
): RateLimitPolicy[] {
  const { envPrefix, limits, message, name } = tool;
  const lead = new RegExp(`/public/${name}/lead/?$`, "i");

  return [
    {
      budgetMessage: message,
      globalBudget: null,
      limitedMessage: RATE_LIMITED_MESSAGE,
      matches: (path) => lead.test(path),
      name: `${name}-lead`,
      perIp: perIpRules(
        env[`${envPrefix}_LEAD_HOURLY_LIMIT`],
        LEAD_LIMITS.hourly,
        env[`${envPrefix}_LEAD_DAILY_LIMIT`],
        LEAD_LIMITS.daily,
      ),
      routes: [`public/${name}/{*splat}`],
    },
    {
      budgetMessage: message,
      globalBudget: {
        key: `global:${name}`,
        rule: {
          limit: readPositiveInt(env[`${envPrefix}_DAILY_BUDGET`], limits.budget),
          windowMs: DAY_MS,
        },
      },
      limitedMessage: RATE_LIMITED_MESSAGE,
      matches: (path) => tool.reads.test(path),
      name,
      perIp: perIpRules(
        env[`${envPrefix}_HOURLY_LIMIT`],
        limits.hourly,
        env[`${envPrefix}_DAILY_LIMIT`],
        limits.daily,
      ),
      routes: [`public/${name}`],
    },
  ];
}

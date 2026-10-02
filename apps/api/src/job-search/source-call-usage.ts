import type { JobSource } from "./job-search.types";

/** Past this share of a monthly quota, the admin screen raises an alert. */
export const QUOTA_ALERT_RATIO = 0.8;

/** What the admin sees of a source's calls (US-163). */
export interface SourceCallUsage {
  callsToday: number;
  callsThisMonth: number;
  /** `null`: the source has no known monthly quota. */
  monthlyQuota: number | null;
  quotaAlert: boolean;
}

/**
 * Monthly quotas we know of. France Travail sends none and fixes none: it
 * depends on the application's status (ADR-027). The day one is granted,
 * `FRANCE_TRAVAIL_OFFRES_MONTHLY_QUOTA` makes the alert work without a release.
 */
export function resolveMonthlyQuotas(
  env: NodeJS.ProcessEnv = process.env,
): Partial<Record<JobSource, number>> {
  const quota = Number(env.FRANCE_TRAVAIL_OFFRES_MONTHLY_QUOTA);

  return Number.isFinite(quota) && quota > 0 ? { france_travail: quota } : {};
}

export function toCallUsage(
  calls: { today: number; month: number } | undefined,
  quota: number | undefined,
): SourceCallUsage {
  const callsThisMonth = calls?.month ?? 0;

  return {
    callsThisMonth,
    callsToday: calls?.today ?? 0,
    monthlyQuota: quota ?? null,
    quotaAlert: quota !== undefined && callsThisMonth >= quota * QUOTA_ALERT_RATIO,
  };
}

/** First day of the month of a `YYYY-MM-DD` date. */
export function monthStartOf(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

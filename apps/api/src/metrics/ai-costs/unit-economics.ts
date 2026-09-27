import {
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_CV_IMPORT,
  AI_CREDIT_ACTION_INTERVIEW_SESSION,
  AI_CREDIT_ACTION_JOB_DIGEST_RERANK,
  AI_CREDIT_ACTION_LETTER_GENERATION,
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  AI_CREDIT_COSTS,
  CREDITS_PER_INTERVIEW_MINUTE,
  type AiFeature,
  type AiFeatureCost,
  type UnitEconomics,
} from "@cvforge/types";
import { percent } from "../shared/metrics-window";

/**
 * Which AI calls make up each billed unit. An interview minute is the spoken
 * turns, their transcription, the report and the company context the prompt
 * is fed. Calls left out here — the ATS impact, the free tools — are not
 * billed to anyone and show only in the per-feature table.
 */
export const BILLED_FEATURES: Record<string, AiFeature[]> = {
  [AI_CREDIT_ACTION_CV_GENERATION]: ["cv_generation"],
  [AI_CREDIT_ACTION_LETTER_GENERATION]: ["letter_generation"],
  [AI_CREDIT_ACTION_CV_IMPORT]: ["cv_import"],
  [AI_CREDIT_ACTION_OFFER_ENRICHMENT]: ["offer_structuring"],
  [AI_CREDIT_ACTION_INTERVIEW_SESSION]: [
    "interview_voice",
    "interview_transcription",
    "interview_report",
    "company_context",
  ],
  [AI_CREDIT_ACTION_JOB_DIGEST_RERANK]: ["job_digest_rerank"],
};

/** Credits one unit costs the candidate; an interview is billed per minute. */
function creditsPerUnit(action: string): number {
  if (action === AI_CREDIT_ACTION_INTERVIEW_SESSION) {
    return CREDITS_PER_INTERVIEW_MINUTE;
  }

  return AI_CREDIT_COSTS[action as keyof typeof AI_CREDIT_COSTS] ?? 1;
}

/**
 * Each billed unit's AI cost against what it brings in. Revenue values the
 * credits at the average price one sold for — welcome and granted credits
 * bring nothing in, so this is the price of a unit when it is paid for.
 */
export function buildUnitEconomics(input: {
  creditsCharged: Record<string, number>;
  features: AiFeatureCost[];
  usdToEurRate: number;
  creditValueEurCents: number | null;
}): UnitEconomics[] {
  const costOf = (features: AiFeature[]) =>
    input.features
      .filter((row) => features.includes(row.feature))
      .reduce((total, row) => total + row.costUsd, 0);

  return Object.entries(BILLED_FEATURES).map(([action, features]) => {
    const perUnit = creditsPerUnit(action);
    const units = Math.round((input.creditsCharged[action] ?? 0) / perUnit);
    const costPerUnitEurCents =
      units > 0 ? (costOf(features) * input.usdToEurRate * 100) / units : null;
    const revenuePerUnitEurCents =
      input.creditValueEurCents === null
        ? null
        : perUnit * input.creditValueEurCents;

    return {
      action,
      costPerUnitEurCents: round(costPerUnitEurCents),
      creditsPerUnit: perUnit,
      marginRate:
        costPerUnitEurCents === null || revenuePerUnitEurCents === null
          ? null
          : percent(revenuePerUnitEurCents - costPerUnitEurCents, revenuePerUnitEurCents),
      revenuePerUnitEurCents: round(revenuePerUnitEurCents),
      units,
    };
  });
}

/** Cents to one decimal: a CV can cost a fraction of a cent. */
function round(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
}

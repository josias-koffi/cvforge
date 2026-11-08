import type { AiFeature } from "@cvforge/types";

export type AnthropicProfile = {
  maxOutputTokens: number;
  effort: "low" | "medium";
};

/**
 * How much room Claude gets per feature. These are floors above the budgets
 * call sites set for OpenRouter: current Claude models think by default and
 * that reasoning counts as output, so the 300 to 900 tokens that suit a model
 * that doesn't would cut the JSON short. `effort` is the cost lever instead.
 * Writing gets `medium`; extraction and scoring don't repay more than `low`.
 */
const EXTRACTION: AnthropicProfile = { effort: "low", maxOutputTokens: 4_000 };
const WRITING: AnthropicProfile = { effort: "medium", maxOutputTokens: 16_000 };

const PROFILES: Partial<Record<AiFeature, AnthropicProfile>> = {
  ats_impact: EXTRACTION,
  company_context: EXTRACTION,
  cv_generation: WRITING,
  cv_import: { effort: "low", maxOutputTokens: 8_000 },
  cv_translation: { effort: "low", maxOutputTokens: 16_000 },
  interview_questions: EXTRACTION,
  interview_report: { effort: "medium", maxOutputTokens: 6_000 },
  job_alert_enrich: EXTRACTION,
  job_digest_rerank: { effort: "low", maxOutputTokens: 6_000 },
  letter_generation: { effort: "medium", maxOutputTokens: 8_000 },
  offer_structuring: EXTRACTION,
};

export function anthropicProfile(
  feature: AiFeature | undefined,
  requestedMaxTokens: number | undefined,
): AnthropicProfile {
  const profile = (feature && PROFILES[feature]) || WRITING;

  return {
    effort: profile.effort,
    maxOutputTokens: Math.max(profile.maxOutputTokens, requestedMaxTokens ?? 0),
  };
}

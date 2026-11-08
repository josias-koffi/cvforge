import type { AnthropicCreditSummary } from "./admin-metrics";
import { aiFeatures, type AiFeature } from "./ai-usage";

/** Who a text call can be sent to. */
export const aiModelProviders = ["anthropic", "openrouter"] as const;
export type AiModelProvider = (typeof aiModelProviders)[number];

/** Who a recorded call was billed by; the voice goes straight to OpenAI (ADR-026). */
export type AiBillingProvider = AiModelProvider | "openai";

export type AiModelChoice = { provider: AiModelProvider; model: string };

/**
 * The Claude models the admin can pick, with their published rates in USD per
 * million tokens (platform.claude.com/docs/en/about-claude/pricing, read on
 * 2026-11-08). Anthropic returns tokens, never dollars, so an unlisted model
 * could not be priced: the list is closed on purpose.
 */
export const anthropicModels = [
  {
    id: "claude-haiku-5-5",
    inputUsdPerMTok: 0.1,
    label: "Claude Haiku 5.5",
    outputUsdPerMTok: 0.5,
  },
  {
    id: "claude-sonnet-5-5",
    inputUsdPerMTok: 2,
    label: "Claude Sonnet 5.5",
    outputUsdPerMTok: 10,
  },
  {
    id: "claude-opus-5-5",
    inputUsdPerMTok: 4,
    label: "Claude Opus 5.5",
    outputUsdPerMTok: 20,
  },
] as const;
export type AnthropicModel = (typeof anthropicModels)[number];

export function findAnthropicModel(id: string): AnthropicModel | undefined {
  return anthropicModels.find((model) => model.id === id);
}

/** Models already measured on this product, offered first in the admin. */
export const openRouterModelSuggestions = [
  "openai/gpt-4.1-mini",
  "openai/gpt-4.1-nano",
  "google/gemini-2.5-flash",
  "mistralai/mistral-small-3.2-24b-instruct",
] as const;

/** `vendor/model`, with an optional `:variant`. */
const OPENROUTER_MODEL_PATTERN = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/i;
const MAX_MODEL_LENGTH = 120;

export function isOpenRouterModelId(value: string): boolean {
  return value.length <= MAX_MODEL_LENGTH && OPENROUTER_MODEL_PATTERN.test(value);
}

/**
 * The features whose model the admin can choose. The two voice features run on
 * OpenAI Realtime, outside the text pipeline, and `other` names no feature.
 */
const NOT_ROUTABLE: readonly AiFeature[] = [
  "interview_voice",
  "interview_transcription",
  "other",
];
export const routableAiFeatures: AiFeature[] = aiFeatures.filter(
  (feature) => !NOT_ROUTABLE.includes(feature),
);

export function isRoutableAiFeature(value: unknown): value is AiFeature {
  return (routableAiFeatures as readonly unknown[]).includes(value);
}

export type AiFeatureModelRow = {
  feature: AiFeature;
  /** The admin's choice; null means the deployment's default applies. */
  choice: AiModelChoice | null;
  /** What runs without a choice, always through OpenRouter. */
  defaultModel: string;
};

export type AiFeatureModelsOverview = {
  /** False until ANTHROPIC_API_KEY is set: Claude cannot be picked. */
  anthropicEnabled: boolean;
  /** Null until a balance is entered. */
  anthropicCredit: AnthropicCreditSummary | null;
  features: AiFeatureModelRow[];
};

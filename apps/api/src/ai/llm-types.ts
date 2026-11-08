import type { AiFeature, AiModelChoice } from "@cvforge/types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  /** What the call is for, so the cockpit can price each feature (US-154). */
  feature?: AiFeature;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: {
    order?: string[];
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
  };
  responseFormat?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
}

/** One model at one provider: a link of the chain a call walks down. */
export type LlmTarget = AiModelChoice;

export function openRouterTarget(model: string): LlmTarget {
  return { model, provider: "openrouter" };
}

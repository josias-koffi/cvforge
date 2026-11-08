import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { AiModelProvider } from "@cvforge/types";
import type { LanguageModel } from "ai";
import { anthropicProfile } from "./anthropic.profiles";
import type { ChatOptions } from "./llm-types";
import type { OpenRouterConfig } from "./openrouter.config";
import { CHAT_OPEN_TIMEOUT_MS, fetchWithOpenTimeout } from "./openrouter.timeout";

const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";

/** The model and the settings one provider needs for this call. */
export type LlmCall = {
  model: LanguageModel;
  temperature?: number;
  maxOutputTokens?: number;
  providerOptions?: { anthropic: { effort: "low" | "medium" } };
};

type LlmCallBuilder = (
  config: OpenRouterConfig,
  model: string,
  options: ChatOptions,
) => LlmCall;

/** Keeps the deadline on every provider, and names the model when it fires. */
function timedFetch(model: string): typeof fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    fetchWithOpenTimeout(
      input instanceof Request ? input.url : String(input),
      init ?? {},
      CHAT_OPEN_TIMEOUT_MS,
      model,
    )) as typeof fetch;
}

const LLM_CALL_BUILDERS: Record<AiModelProvider, LlmCallBuilder> = {
  // `temperature` is left out on purpose: current Claude models reject it.
  anthropic: (config, model, options) => {
    const { effort, maxOutputTokens } = anthropicProfile(options.feature, options.maxTokens);
    const anthropic = createAnthropic({
      apiKey: config.anthropicApiKey,
      baseURL: ANTHROPIC_BASE_URL,
      fetch: timedFetch(model),
    });

    return {
      maxOutputTokens,
      model: anthropic(model),
      providerOptions: { anthropic: { effort } },
    };
  },

  // `transforms: []` keeps prompts out of OpenRouter's logging; `data_collection`
  // restricts routing to ZDR providers when ENABLE_ZDR_CHAT is on (ADR-013).
  openrouter: (config, model, options) => {
    const openrouter = createOpenRouter({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      compatibility: "strict",
      fetch: timedFetch(model),
      headers: { "HTTP-Referer": "https://cvforge.app", "X-Title": "CVforge" },
    });

    return {
      maxOutputTokens: options.maxTokens,
      model: openrouter.chat(model, {
        extraBody: {
          transforms: [],
          ...(config.enableZdrChat && { data_collection: "deny" }),
        },
        ...(options.provider && { provider: options.provider }),
        ...(options.responseFormat && {
          structuredOutputs: { strict: options.responseFormat.json_schema.strict },
        }),
        usage: { include: true },
      }),
      temperature: options.temperature,
    };
  },
};

export function buildLlmCall(
  config: OpenRouterConfig,
  provider: AiModelProvider,
  model: string,
  options: ChatOptions,
): LlmCall {
  return LLM_CALL_BUILDERS[provider](config, model, options);
}

import {
  generateText,
  jsonSchema,
  NoObjectGeneratedError,
  Output,
  type ModelMessage,
} from "ai";
import { readCost, type UsageFigures } from "./ai-usage";
import { priceAnthropicUsage } from "./anthropic.pricing";
import { buildLlmCall } from "./llm-model.factory";
import type { ChatMessage, ChatOptions, LlmTarget } from "./llm-types";
import type { OpenRouterConfig } from "./openrouter.config";
import { toLlmRequestError } from "./openrouter.error";

export type LlmAttemptResult = { text: string; usage: UsageFigures };

type TokenCounts = { inputTokens?: number; outputTokens?: number };

function usageOf(
  target: LlmTarget,
  tokens: TokenCounts | undefined,
  providerMetadata: unknown,
): UsageFigures {
  const promptTokens = tokens?.inputTokens ?? 0;
  const completionTokens = tokens?.outputTokens ?? 0;

  return {
    completionTokens,
    costUsd:
      target.provider === "anthropic"
        ? priceAnthropicUsage(target.model, promptTokens, completionTokens)
        : readCost(providerMetadata),
    promptTokens,
  };
}

function outputOf(options: ChatOptions) {
  if (!options.responseFormat) return {};
  const { name, schema } = options.responseFormat.json_schema;

  // No validator: as before, each caller parses and bounds what comes back.
  return { output: Output.object({ name, schema: jsonSchema(schema) }) };
}

/**
 * One try at one target. `maxRetries: 0` because `runModelChain` already owns
 * retries and failover; two layers would multiply the attempts.
 */
export async function runLlmAttempt(
  config: OpenRouterConfig,
  target: LlmTarget,
  messages: ChatMessage[],
  options: ChatOptions,
): Promise<LlmAttemptResult> {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const conversation = messages.filter(
    (message) => message.role !== "system",
  ) as ModelMessage[];

  try {
    const result = await generateText({
      ...buildLlmCall(config, target.provider, target.model, options),
      ...outputOf(options),
      maxRetries: 0,
      messages: conversation,
      ...(system && { system }),
    });

    return {
      text: result.text,
      usage: usageOf(target, result.usage, result.providerMetadata),
    };
  } catch (error) {
    // Unparseable JSON was still paid for, and the callers already handle it.
    if (NoObjectGeneratedError.isInstance(error)) {
      return { text: error.text ?? "", usage: usageOf(target, error.usage, undefined) };
    }

    throw toLlmRequestError(error, target.model);
  }
}

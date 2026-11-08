import { findAnthropicModel } from "@cvforge/types";

const TOKENS_PER_MILLION = 1_000_000;

/**
 * What a direct Claude call cost, in USD. The model priced is the one we asked
 * for, because the API may answer with a dated id the list does not know.
 * Reasoning tokens are already part of the output count. Haiku's higher rate
 * for prompts over 100K tokens is left out: no prompt here comes near that.
 */
export function priceAnthropicUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = findAnthropicModel(model);
  if (!rates) return 0;

  return (
    (inputTokens * rates.inputUsdPerMTok + outputTokens * rates.outputUsdPerMTok) /
    TOKENS_PER_MILLION
  );
}

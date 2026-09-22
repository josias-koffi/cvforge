import { clamp, toScore } from "../normalize";
import type { AtsDocument, AtsLlmSignals } from "../types";
import { scoreImpactByRules } from "./impact-rules";

/**
 * How far the model may move the rule-based score, in either direction.
 *
 * The model refines, it does not decide. Without this, a hallucinated set of
 * sub-scores could hand a threadbare CV an excellent impact score — and since
 * the score is persisted and charted across versions, that error would outlive
 * the request that made it.
 */
export const LLM_INFLUENCE = 25;

/** Each sub-score is 0..10; these weights turn the four of them into 0..100. */
const LLM_WEIGHTS = {
  actionVerbs: 30,
  consistency: 20,
  quantification: 30,
  relevance: 20,
} as const;

/**
 * The `impact` dimension: rules always, the model only as a bounded correction.
 *
 * `applied` is false whenever the model was not consulted or its answer was
 * unusable, so the caller can say the score was computed without it rather
 * than pretending otherwise.
 */
export function scoreImpact(doc: AtsDocument, llm?: AtsLlmSignals | null) {
  const rules = scoreImpactByRules(doc);

  if (!llm) {
    return { ...rules, applied: false };
  }

  const blended = clamp(
    llmScore(llm),
    rules.score - LLM_INFLUENCE,
    rules.score + LLM_INFLUENCE,
  );

  return { ...rules, applied: true, score: toScore(blended) };
}

function llmScore(llm: AtsLlmSignals) {
  return (
    (llm.actionVerbs * LLM_WEIGHTS.actionVerbs +
      llm.quantification * LLM_WEIGHTS.quantification +
      llm.relevance * LLM_WEIGHTS.relevance +
      llm.consistency * LLM_WEIGHTS.consistency) /
    10
  );
}

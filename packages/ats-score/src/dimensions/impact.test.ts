import { describe, expect, it } from "vitest";
import { scoreAts } from "../engine";
import { makeDocument, makeExperience } from "../testing/make-document";
import type { AtsLlmSignals } from "../types";
import { LLM_INFLUENCE } from "./impact";

function signals(overrides: Partial<AtsLlmSignals> = {}): AtsLlmSignals {
  return {
    actionVerbs: 5,
    consistency: 5,
    highlights: [],
    improvements: [],
    quantification: 5,
    relevance: 5,
    ...overrides,
  };
}

/** A CV whose bullets fail every rule, so the rule score sits at the bottom. */
const WEAK = makeDocument({
  experiences: [
    makeExperience({
      bullets: ["Responsable du support.", "En charge du suivi."],
    }),
  ],
  skills: ["cobol"],
});

function impactOf(doc = makeDocument(), llm?: AtsLlmSignals) {
  const result = scoreAts(doc, llm ? { llm } : {});
  const dimension = result.dimensions.find((item) => item.key === "impact");

  if (!dimension) throw new Error("impact missing");

  return { llmApplied: result.llmApplied, score: dimension.score ?? 0 };
}

describe("impact — model influence", () => {
  it("uses the rules alone when no signals are supplied", () => {
    const { llmApplied, score } = impactOf();

    expect(llmApplied).toBe(false);
    expect(score).toBe(100);
  });

  it("reports the model as applied once signals are supplied", () => {
    expect(impactOf(makeDocument(), signals()).llmApplied).toBe(true);
  });

  /**
   * The guard that matters: a hallucinated set of top marks cannot lift a CV
   * that fails every rule, because the score is persisted and charted.
   */
  it("cannot lift a weak CV beyond the rules' verdict plus the cap", () => {
    const rulesOnly = impactOf(WEAK).score;
    const flattered = impactOf(
      WEAK,
      signals({
        actionVerbs: 10,
        consistency: 10,
        quantification: 10,
        relevance: 10,
      }),
    ).score;

    expect(flattered).toBeLessThanOrEqual(rulesOnly + LLM_INFLUENCE);
  });

  it("cannot sink a strong CV below the rules' verdict minus the cap", () => {
    const rulesOnly = impactOf().score;
    const harsh = impactOf(
      makeDocument(),
      signals({
        actionVerbs: 0,
        consistency: 0,
        quantification: 0,
        relevance: 0,
      }),
    ).score;

    expect(harsh).toBeGreaterThanOrEqual(rulesOnly - LLM_INFLUENCE);
  });

  it("moves the score when the model disagrees within the cap", () => {
    const rulesOnly = impactOf(WEAK).score;
    const nudged = impactOf(
      WEAK,
      signals({ actionVerbs: 6, consistency: 6, quantification: 6, relevance: 6 }),
    ).score;

    expect(nudged).toBeGreaterThan(rulesOnly);
  });

  it("keeps the blended score inside 0-100", () => {
    const score = impactOf(
      WEAK,
      signals({
        actionVerbs: 10,
        consistency: 10,
        quantification: 10,
        relevance: 10,
      }),
    ).score;

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  /** Findings come from the rules, which always run — the model never hides one. */
  it("keeps the rule findings even when the model flatters the CV", () => {
    const codes = scoreAts(WEAK, {
      llm: signals({
        actionVerbs: 10,
        consistency: 10,
        quantification: 10,
        relevance: 10,
      }),
    }).findings.map((finding) => finding.code);

    expect(codes).toContain("MISSING_QUANTIFICATION");
  });

  it("stays deterministic for the same signals", () => {
    const llm = signals({ actionVerbs: 7 });

    expect(scoreAts(WEAK, { llm })).toEqual(scoreAts(WEAK, { llm }));
  });
});

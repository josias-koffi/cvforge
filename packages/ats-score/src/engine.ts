import { scoreContactability } from "./dimensions/contactability";
import { scoreFormatHygiene } from "./dimensions/format-hygiene";
import { scoreImpact } from "./dimensions/impact";
import { scoreKeywords } from "./dimensions/keywords";
import { scoreMachineReadability } from "./dimensions/machine-readability";
import { scoreStructure } from "./dimensions/structure";
import { toScore } from "./normalize";
import {
  ATS_SCORE_ENGINE_VERSION,
  type AtsDimension,
  type AtsDimensionKey,
  type AtsDocument,
  type AtsFinding,
  type AtsFindingCode,
  type AtsScoreContext,
  type AtsScoreResult,
  type AtsUnavailableReason,
} from "./types";
import { ATS_DIMENSION_WEIGHTS, CRITICAL_CAPS, bandFor } from "./weights";

type DimensionOutcome = {
  score: number;
  findings: AtsFinding[];
};

/**
 * The single entry point. Pure by construction: same document, same context,
 * same result — which is what lets a score be persisted, compared across CV
 * versions, and recomputed on every save for free.
 */
export function scoreAts(
  doc: AtsDocument,
  // Part of the contract from the start so callers are written once. The offer
  // and the model signals are consumed by the `keywords` and `impact`
  // dimensions, which land in the next story.
  context: AtsScoreContext = {},
): AtsScoreResult {
  const outcomes = new Map<AtsDimensionKey, DimensionOutcome>();
  const unavailable = new Map<AtsDimensionKey, AtsUnavailableReason>();

  // Machine readability needs signals only a real file carries; the in-app path
  // scores a structured document and has none.
  if (doc.file) {
    outcomes.set("machineReadability", scoreMachineReadability(doc.file));
  } else {
    unavailable.set("machineReadability", "NO_FILE_SIGNALS");
  }

  /**
   * A file with no text layer yielded nothing to read, so nothing about its
   * contents is observable. Scoring the other dimensions on the empty document
   * that came out would tell the candidate their CV has no experience section
   * and no email — when in truth it may have both and we simply could not see
   * them. Only readability is judged, and `NO_TEXT_LAYER` is then the single
   * thing worth saying.
   */
  if (doc.file?.hasTextLayer === false) {
    for (const key of ["structure", "contactability", "formatHygiene", "impact", "keywords"] as const) {
      unavailable.set(key, "NO_TEXT_LAYER");
    }

    return buildResult(outcomes, unavailable, false);
  }

  outcomes.set("structure", scoreStructure(doc));
  outcomes.set("contactability", scoreContactability(doc));
  outcomes.set("formatHygiene", scoreFormatHygiene(doc));

  const impact = scoreImpact(doc, context.llm);
  outcomes.set("impact", impact);

  // Only an offer makes relevance observable. Without one the dimension is
  // excluded and the weights renormalise — the public landing scan is scored on
  // five dimensions, not punished on six.
  const keywords = context.offer ? scoreKeywords(doc, context.offer) : null;

  if (keywords) {
    outcomes.set("keywords", keywords);
  } else {
    unavailable.set("keywords", "NO_OFFER");
  }

  return buildResult(outcomes, unavailable, impact.applied);
}

function buildResult(
  outcomes: Map<AtsDimensionKey, DimensionOutcome>,
  unavailable: Map<AtsDimensionKey, AtsUnavailableReason>,
  llmApplied: boolean,
): AtsScoreResult {
  const dimensions = buildDimensions(outcomes, unavailable);
  const findings = sortFindings(
    [...outcomes.values()].flatMap((outcome) => outcome.findings),
  );
  const cap = lowestCap(findings);
  const weighted = overallFrom(dimensions);
  const overallScore = cap ? Math.min(weighted, cap.score) : weighted;

  return {
    band: bandFor(overallScore),
    ...(cap && cap.score < weighted ? { cappedBy: cap.code } : {}),
    dimensions,
    engineVersion: ATS_SCORE_ENGINE_VERSION,
    findings,
    llmApplied,
    overallScore,
  };
}

/**
 * The harshest ceiling any critical finding imposes.
 *
 * Warnings never cap: the same code can be raised at either severity, and a CV
 * that is merely short is not a CV that is empty.
 */
function lowestCap(findings: AtsFinding[]) {
  return findings
    .filter((finding) => finding.severity === "critical")
    .map((finding) => ({ code: finding.code, score: CRITICAL_CAPS[finding.code] }))
    .filter((cap): cap is { code: AtsFindingCode; score: number } =>
      cap.score !== undefined,
    )
    .sort((a, b) => a.score - b.score)[0];
}

function buildDimensions(
  outcomes: Map<AtsDimensionKey, DimensionOutcome>,
  unavailable: Map<AtsDimensionKey, AtsUnavailableReason>,
): AtsDimension[] {
  return (Object.keys(ATS_DIMENSION_WEIGHTS) as AtsDimensionKey[]).map(
    (key) => {
      const outcome = outcomes.get(key);

      if (outcome) {
        return { key, score: outcome.score, status: "scored" as const };
      }

      return {
        key,
        score: null,
        status: "unavailable" as const,
        unavailableReason: unavailable.get(key) ?? "NO_FILE_SIGNALS",
      };
    },
  );
}

/**
 * Weighted mean over the scored dimensions only, with the weights renormalised
 * to their own sum. An unobservable dimension must not drag the score down: a
 * CV scanned without a job offer is evaluated on fewer dimensions, not judged
 * for a question it was never asked.
 */
function overallFrom(dimensions: AtsDimension[]) {
  const scored = dimensions.filter(
    (dimension) => dimension.status === "scored" && dimension.score !== null,
  );

  if (scored.length === 0) return 0;

  const totalWeight = scored.reduce(
    (sum, dimension) => sum + ATS_DIMENSION_WEIGHTS[dimension.key],
    0,
  );

  const weighted = scored.reduce(
    (sum, dimension) =>
      sum + ATS_DIMENSION_WEIGHTS[dimension.key] * (dimension.score ?? 0),
    0,
  );

  return toScore(weighted / totalWeight);
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

/** Worst first: the UI shows the top few and the rest sit behind the unlock. */
function sortFindings(findings: AtsFinding[]) {
  return [...findings].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

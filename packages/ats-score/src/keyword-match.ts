import { isOfferStopword } from "./lexicons";
import { extractKeywords, normalizeToken, toScore } from "./normalize";

/** How many terms of each list are returned: past that, a list stops being read. */
export const KEYWORD_MATCH_LIST_LIMIT = 30;

/** Same thresholds as the `keywords` dimension and its critical finding. */
const LOW_COVERAGE = 30;
const GOOD_COVERAGE = 60;

/**
 * "Vous concevrez", "vous maîtrisez": a French offer addresses the candidate
 * in the second person plural, and those verbs are not skills anyone puts on
 * a CV. Filtered here only — the `keywords` dimension keeps its vocabulary,
 * or every stored ATS score would shift without an engine version bump.
 */
const ADDRESSED_VERB = /ez$/;

export type KeywordMatchBand = "low" | "fair" | "good";

export type KeywordMatchResult = {
  /** Share of the offer's terms found in the CV, 0-100. */
  coverage: number;
  band: KeywordMatchBand;
  matchedCount: number;
  missingCount: number;
  /** Most frequent in the offer first, at most `KEYWORD_MATCH_LIST_LIMIT`. */
  matched: string[];
  missing: string[];
};

/**
 * The terms of an offer worth looking for in a CV: four letters or more, with
 * the recruiting boilerplate dropped. Shared with the `keywords` dimension so
 * the free comparator and the score never disagree on what the offer asks.
 */
export function offerTerms(values: Array<string | null | undefined>) {
  return extractKeywords(values).filter((keyword) => !isOfferStopword(keyword));
}

/**
 * The free CV ↔ offer comparator (US-136): which of the offer's terms the CV
 * already contains. Deterministic, no model, nothing kept.
 *
 * Null when the offer has no usable term: an empty comparison would otherwise
 * read as a 0 % the candidate did nothing to earn.
 */
export function matchOfferKeywords(
  cvText: string,
  offerText: string,
): KeywordMatchResult | null {
  const frequency = countTokens(offerText);
  // Most repeated first: an offer names what it cares about more than once,
  // and a truncated list must keep those rather than the first words read.
  const wanted = offerTerms([offerText])
    .filter((term) => !ADDRESSED_VERB.test(term))
    .sort((a, b) => (frequency.get(b) ?? 0) - (frequency.get(a) ?? 0));

  if (wanted.length === 0) return null;

  const present = new Set(countTokens(cvText).keys());
  const matched = wanted.filter((term) => present.has(term));
  const missing = wanted.filter((term) => !present.has(term));
  const coverage = toScore((matched.length / wanted.length) * 100);

  return {
    band:
      coverage < LOW_COVERAGE
        ? "low"
        : coverage >= GOOD_COVERAGE
          ? "good"
          : "fair",
    coverage,
    matched: matched.slice(0, KEYWORD_MATCH_LIST_LIMIT),
    matchedCount: matched.length,
    missing: missing.slice(0, KEYWORD_MATCH_LIST_LIMIT),
    missingCount: missing.length,
  };
}

function countTokens(text: string) {
  const counts = new Map<string, number>();

  for (const token of normalizeToken(text).split(/\s+/)) {
    if (token.length >= 4) counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return counts;
}

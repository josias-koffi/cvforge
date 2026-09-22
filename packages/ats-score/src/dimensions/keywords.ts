import { isOfferStopword } from "../lexicons";
import { extractKeywords, normalizeToken, toScore } from "../normalize";
import type { AtsDocument, AtsFinding, AtsOfferContext } from "../types";

/**
 * Coverage at which a CV already speaks the offer's language. Matching every
 * single term is not a better CV — it is a CV written for a parser — so the
 * scale tops out here instead of rewarding the last 40 %.
 */
const FULL_CREDIT_COVERAGE = 0.6;

/** One term repeated this often stops reading as relevance and starts reading as stuffing. */
const MAX_REPEATS = 6;

/**
 * How much of the offer's vocabulary the CV actually contains.
 *
 * Only scoreable against an offer: the public landing scan has none, and the
 * engine then excludes this dimension rather than scoring it zero.
 */
export function scoreKeywords(doc: AtsDocument, offer: AtsOfferContext) {
  // Recruiting boilerplate is dropped: a pasted offer is mostly prose about
  // the company, and counting it would bury the handful of terms that actually
  // describe the job.
  const wanted = extractKeywords([
    offer.title,
    ...offer.requirements,
    ...offer.responsibilities,
  ]).filter((keyword) => !isOfferStopword(keyword));

  const haystack = normalizeToken(documentText(doc));
  const present = new Set(
    haystack.split(/\s+/).filter((token) => token.length >= 4),
  );

  // An offer with no usable term cannot judge anything; saying so beats
  // inventing a 0 or a 100 out of an empty comparison.
  if (wanted.length === 0) return null;

  const matched = wanted.filter((keyword) => present.has(keyword));
  const coverage = matched.length / wanted.length;
  const score = toScore((coverage * 100) / FULL_CREDIT_COVERAGE);

  const findings: AtsFinding[] = [];

  if (coverage < 0.3) {
    findings.push({
      code: "LOW_KEYWORD_COVERAGE",
      dimension: "keywords",
      severity: "critical",
    });
  }

  // Counted on the document itself, never on the enriched haystack: that one
  // concatenates the skills and the bullets on top of a `rawText` that already
  // contains them, so every term was counted two or three times and an ordinary
  // CV tripped the stuffing threshold.
  if (isStuffed(normalizeToken(doc.rawText), matched)) {
    findings.push({
      code: "KEYWORD_STUFFING",
      dimension: "keywords",
      severity: "warning",
    });
  }

  return { findings, score };
}

/**
 * Repetition, not coverage, is what gives keyword stuffing away: a CV that
 * names a technology nine times is padding, whatever its coverage.
 */
function isStuffed(haystack: string, matched: string[]) {
  const tokens = haystack.split(/\s+/);

  return matched.some(
    (keyword) =>
      tokens.filter((token) => token === keyword).length > MAX_REPEATS,
  );
}

/**
 * Skills and bullets carry the terms a recruiter searches for; the raw text
 * alone would miss a structured document, whose skills never appear in prose.
 */
function documentText(doc: AtsDocument) {
  return [
    doc.rawText,
    ...doc.skills,
    ...doc.experiences.flatMap((experience) => [
      experience.role,
      experience.company,
      ...experience.bullets,
    ]),
  ].join(" ");
}

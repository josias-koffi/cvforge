import { isOfferStopword } from "../lexicons";
import { offerTerms } from "../keyword-match";
import { foldPlural } from "../morphology";
import { normalizeToken, toScore } from "../normalize";
import type { AtsDocument, AtsFinding, AtsOfferContext } from "../types";

/**
 * Coverage at which a CV already speaks the offer's language. Matching every
 * single term is not a better CV — it is a CV written for a parser — so the
 * scale tops out here instead of rewarding the last 40 %.
 */
const FULL_CREDIT_COVERAGE = 0.6;

/** One term repeated this often stops reading as relevance and starts reading as stuffing. */
const MAX_REPEATS = 6;

/** Enough to act on; past that the list reads as a verdict rather than a to-do. */
const MISSING_TERMS_LIMIT = 8;

/** Glue words of a keyword phrase: "gestion de projet" is matched on its two nouns. */
const FUNCTION_WORDS = new Set([
  "a", "and", "au", "aux", "d", "de", "des", "du", "en", "et", "for", "in",
  "l", "la", "le", "les", "of", "on", "or", "ou", "par", "sur", "the", "to",
  "un", "une",
]);

type Term = { label: string; tokens: string[] };

/**
 * How much of the offer's vocabulary the CV actually contains.
 *
 * Only scoreable against an offer: the public landing scan has none, and the
 * engine then excludes this dimension rather than scoring it zero.
 */
export function scoreKeywords(doc: AtsDocument, offer: AtsOfferContext) {
  const fromKeywords = keywordTerms(offer.keywords ?? []);
  const terms = fromKeywords.length > 0 ? fromKeywords : sentenceTerms(offer);

  // An offer with no usable term cannot judge anything; saying so beats
  // inventing a 0 or a 100 out of an empty comparison.
  if (terms.length === 0) return null;

  const present = new Set(
    normalizeToken(documentText(doc)).split(/\s+/).filter(Boolean).map(foldPlural),
  );
  const isPresent = (term: Term) =>
    term.tokens.every((token) => present.has(foldPlural(token)));

  const matched = terms.filter(isPresent);
  const coverage = matched.length / terms.length;
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
  const matchedTokens = matched.flatMap((term) => term.tokens);
  if (isStuffed(normalizeToken(doc.rawText), matchedTokens)) {
    findings.push({
      code: "KEYWORD_STUFFING",
      dimension: "keywords",
      severity: "warning",
    });
  }

  // Words cut out of the offer's sentences ("contribuer", "différents") are no
  // advice to anyone; only the offer's own keywords are worth listing.
  const missingTerms =
    fromKeywords.length > 0
      ? terms
          .filter((term) => !isPresent(term))
          .map((term) => term.label)
          .slice(0, MISSING_TERMS_LIMIT)
      : undefined;

  return { findings, missingTerms, score };
}

/**
 * The offer's keywords, as the structuring model extracted them in the offer's
 * own wording. A phrase counts when every one of its significant words is in
 * the CV, so "montage vidéo" is not satisfied by "montage" alone.
 */
function keywordTerms(keywords: string[]): Term[] {
  const seen = new Set<string>();

  return keywords.flatMap((label) => {
    const tokens = normalizeToken(label)
      .split(/\s+/)
      .filter(
        (token) =>
          token.length >= 2 &&
          !FUNCTION_WORDS.has(token) &&
          !isOfferStopword(token),
      );
    const key = tokens.map(foldPlural).join(" ");

    if (tokens.length === 0 || seen.has(key)) return [];
    seen.add(key);

    return [{ label: label.trim(), tokens }];
  });
}

/**
 * Fallback for an offer structured before keywords were extracted: every
 * significant word of its sentences. Coarse — it counts verbs no CV carries —
 * which is why keywords take precedence whenever they exist.
 */
function sentenceTerms(offer: AtsOfferContext): Term[] {
  return offerTerms([
    offer.title,
    ...offer.requirements,
    ...offer.responsibilities,
  ]).map((token) => ({ label: token, tokens: [token] }));
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

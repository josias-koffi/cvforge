import {
  hammingDistance,
  trigramSimilarity,
  tokenizeTitle,
} from "./job-keys";

/**
 * Deciding whether an advert belongs to a job already collected.
 *
 * Three steps, from certain to merely likely. The thresholds are the whole
 * design: too loose and two different jobs at the same company merge, and the
 * candidate never sees one of them.
 *
 * **Known limitation**: the same job published in French on one board and in
 * English on another shares neither words nor description, so only a shared
 * link merges it. In practice that is the common case — a France Travail offer
 * carries the company's own link — but a pair without one will show twice.
 *
 * The strict step deliberately ignores dates: a company reposting the exact
 * same advert months later is the republication case, and merging it is what
 * stops an old offer coming back as new.
 */

export type MatchMethod = "url" | "strict_key" | "fuzzy";

export interface MatchCandidate {
  jobId: string;
  companyKey: string;
  titleKey: string;
  department: string;
  descriptionSimhash: string;
  publishedAt: string | null;
  companyAnonymous: boolean;
}

export interface MatchSubject {
  companyKey: string;
  titleKey: string;
  title: string;
  department: string;
  descriptionSimhash: string;
  publishedAt: string | null;
  companyAnonymous: boolean;
}

export interface MatchResult {
  jobId: string;
  method: MatchMethod;
  confidence: number;
}

export interface FuzzyThresholds {
  /** Trigram similarity of the two titles. */
  titleSimilarity: number;
  /** Bits that may differ between the two descriptions. */
  descriptionDistance: number;
  /** Bits allowed when the employer is hidden, so the title cannot be trusted. */
  anonymousDescriptionDistance: number;
  /** How far apart the two publication dates may be. */
  publishedWithinDays: number;
}

/**
 * Measured on real adverts, not guessed (2026-09-23):
 *
 * | Compared                                   | Distance / similarity |
 * |--------------------------------------------|----------------------|
 * | same advert, one adds a legal footer        | 4 bits               |
 * | same advert, one truncated to 60 % (Adzuna) | 8 bits               |
 * | unrelated adverts                           | 14 bits              |
 * | "Développeur/Développeuse Full Stack"       | 0.74                 |
 * | "Data Analyst" / "Data Analyst Senior"      | 0.65                 |
 * | "Développeur Back-end" / "Front-end"        | 0.54                 |
 *
 * Hence 10 bits where a title has to agree as well, and 3 bits where the
 * description is the only evidence there is.
 */
export const DEFAULT_FUZZY_THRESHOLDS: FuzzyThresholds = {
  anonymousDescriptionDistance: 3,
  descriptionDistance: 10,
  publishedWithinDays: 21,
  titleSimilarity: 0.7,
};

/**
 * How close two words must be to count as the same one.
 *
 * Gendered spellings sit at 0.67 to 0.71 ("developpeur"/"developpeuse",
 * "technicien"/"technicienne"), genuinely different words at 0.27 and below
 * ("senior"/"junior", "back"/"front"). The gap is wide; 0.6 sits in it.
 */
const SAME_WORD_SIMILARITY = 0.6;

const MS_PER_DAY = 86_400_000;

/**
 * The job an advert belongs to, or `null` to open a new one.
 *
 * `byUrl` comes from a lookup on the links the advert carries — its own, its
 * application link, and the partner links France Travail publishes. It is the
 * only step that needs no judgement.
 */
export function matchJob(
  subject: MatchSubject,
  candidates: readonly MatchCandidate[],
  options: { byUrl?: string | null; thresholds?: FuzzyThresholds } = {},
): MatchResult | null {
  if (options.byUrl) {
    return { confidence: 1, jobId: options.byUrl, method: "url" };
  }

  const thresholds = options.thresholds ?? DEFAULT_FUZZY_THRESHOLDS;

  // A company nobody names cannot be keyed on, so the strict step is skipped
  // for it entirely rather than matching every other anonymous offer.
  if (subject.companyKey && subject.titleKey) {
    const strict = candidates.find(
      (candidate) =>
        candidate.companyKey === subject.companyKey &&
        candidate.titleKey === subject.titleKey &&
        candidate.department === subject.department,
    );

    if (strict) {
      return { confidence: 0.9, jobId: strict.jobId, method: "strict_key" };
    }
  }

  let best: MatchResult | null = null;

  for (const candidate of candidates) {
    const score = fuzzyScore(subject, candidate, thresholds);
    if (score === null) continue;

    if (!best || score > best.confidence) {
      best = { confidence: score, jobId: candidate.jobId, method: "fuzzy" };
    }
  }

  return best;
}

/**
 * How close two adverts are, or `null` when they must not be merged.
 *
 * Both the title *and* the description have to agree: a company posts
 * "Développeur Back-end" and "Développeur Front-end" with near-identical
 * boilerplate, and titles alone would merge them.
 */
function fuzzyScore(
  subject: MatchSubject,
  candidate: MatchCandidate,
  thresholds: FuzzyThresholds,
): number | null {
  if (!withinDays(subject.publishedAt, candidate.publishedAt, thresholds.publishedWithinDays)) {
    return null;
  }

  const distance = hammingDistance(
    subject.descriptionSimhash,
    candidate.descriptionSimhash,
  );

  // Neither side names the employer: the description is all there is, so the
  // bar is raised rather than lowered.
  if (subject.companyAnonymous || candidate.companyAnonymous) {
    if (distance > thresholds.anonymousDescriptionDistance) return null;

    return 0.6;
  }

  if (!subject.companyKey || subject.companyKey !== candidate.companyKey) {
    return null;
  }

  if (subject.department !== candidate.department) return null;

  const similarity = trigramSimilarity(subject.titleKey, candidate.titleKey);
  if (similarity < thresholds.titleSimilarity) return null;
  if (distance > thresholds.descriptionDistance) return null;

  // A title whose meaningful words differ is a different job, whatever the
  // trigrams say: "back end" and "front end" share most of their characters.
  if (!sameCoreWords(subject.titleKey, candidate.titleKey)) return null;

  return Math.min(0.85, similarity);
}

/**
 * The meaningful words of both titles have to pair up one for one.
 *
 * Not an exact match: "Développeur" and "Développeuse" are the same job
 * written twice, and a strict comparison would split every advert a company
 * publishes in both spellings.
 */
function sameCoreWords(left: string, right: string): boolean {
  const a = [...new Set(tokenizeTitle(left))];
  const b = [...new Set(tokenizeTitle(right))];
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return false;

  const unmatched = [...b];

  for (const word of a) {
    const index = unmatched.findIndex(
      (candidate) =>
        candidate === word ||
        trigramSimilarity(candidate, word) >= SAME_WORD_SIMILARITY,
    );

    if (index === -1) return false;
    unmatched.splice(index, 1);
  }

  return true;
}

/** An unknown date on either side is not evidence of anything. */
function withinDays(
  left: string | null,
  right: string | null,
  days: number,
): boolean {
  if (!left || !right) return true;

  const difference = Math.abs(Date.parse(left) - Date.parse(right));

  return Number.isFinite(difference) && difference <= days * MS_PER_DAY;
}

/**
 * Text primitives shared by every dimension.
 *
 * These are the canonical home of `normalizeToken` / `extractKeywords`, which
 * exist twice today — private in apps/api/src/interview/interview.stats.ts and
 * duplicated in apps/web/lib/interview/insights.ts. Migrating those two callers
 * is tracked separately; doing it here would balloon this diff.
 */

/** Accent- and case-insensitive, punctuation stripped, so "Éthique" matches "ethique". */
export function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
}

/** Tokens of four characters or more, deduplicated — short words carry no signal. */
export function extractKeywords(values: Array<string | null | undefined>) {
  return [
    ...new Set(
      values
        .flatMap((value) => normalizeToken(value ?? "").split(/\s+/))
        .map((token) => token.trim())
        .filter((token) => token.length >= 4),
    ),
  ];
}

export function countWords(value: string) {
  return value.split(/\s+/).filter((word) => word.length > 0).length;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Scores are integers on 0-100 everywhere; rounding in one place keeps them so. */
export function toScore(value: number) {
  return Math.round(clamp(value, 0, 100));
}

/**
 * Awards each rule's points when it holds. Every deterministic dimension is
 * expressed this way so the weights of a dimension are readable in one glance
 * and always add up to 100.
 */
export type ScoringRule = {
  points: number;
  passed: boolean;
};

export function awardPoints(rules: ScoringRule[]) {
  return toScore(
    rules.reduce((total, rule) => total + (rule.passed ? rule.points : 0), 0),
  );
}

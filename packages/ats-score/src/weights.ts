import type { AtsDimensionKey, AtsFindingCode, AtsScoreBand } from "./types";

/**
 * The scale. Weights sum to 100 so a full set of scored dimensions needs no
 * renormalisation at all — and a test asserts that sum, because a silent drift
 * here would move every user's score at once.
 */
export const ATS_DIMENSION_WEIGHTS: Record<AtsDimensionKey, number> = {
  machineReadability: 20,
  structure: 20,
  keywords: 20,
  impact: 20,
  contactability: 10,
  formatHygiene: 10,
};

const BAND_FLOORS: Array<{ floor: number; band: AtsScoreBand }> = [
  { floor: 85, band: "excellent" },
  { floor: 70, band: "good" },
  { floor: 50, band: "fair" },
  { floor: 0, band: "weak" },
];

export function bandFor(score: number): AtsScoreBand {
  return BAND_FLOORS.find(({ floor }) => score >= floor)?.band ?? "weak";
}

/**
 * The ceiling a critical defect puts on the whole score.
 *
 * A weighted mean cannot express "this one thing disqualifies the CV": a
 * three-line CV lost four points overall, because length weighs on a single
 * dimension worth ten. Yet no recruiter reads a CV with no email and calls it
 * excellent — they stop at the missing email.
 *
 * So a critical finding caps the total, and the lowest cap wins. The arithmetic
 * above still ranks CVs against each other; this stops a fatal flaw being
 * averaged away by everything the candidate did get right.
 *
 * Only `critical` findings cap. The same code raised as a warning (a CV that is
 * merely short rather than empty) leaves the score alone.
 */
export const CRITICAL_CAPS: Partial<Record<AtsFindingCode, number>> = {
  // Nothing to index: not a CV yet, whatever else it does well.
  TOO_SHORT: 45,
  // No career to read.
  MISSING_EXPERIENCE_SECTION: 50,
  // The parser interleaves the columns and the career becomes nonsense.
  MULTI_COLUMN_LAYOUT: 55,
  // A recruiter who wants to answer cannot.
  MISSING_EMAIL: 65,
  // No seniority can be computed from it.
  UNPARSABLE_DATES: 70,
  // The offer's vocabulary is absent: the CV reads as off-target.
  LOW_KEYWORD_COVERAGE: 70,
  // Screening filters on skills; there are none to match.
  MISSING_SKILLS_SECTION: 75,
  // Duties without results — the most common reason a good career reads flat.
  MISSING_QUANTIFICATION: 80,
};

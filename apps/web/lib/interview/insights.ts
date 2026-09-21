import type {
  ExtractedOfferFields,
  InterviewReport,
  InterviewReportMetric,
} from "@cvforge/types"

/** How many things to work on. A list of five is a report, not a takeaway. */
const FOCUS_COUNT = 2
/** Below this, a dimension is worth naming as a weak point. */
const FOCUS_THRESHOLD = 7
/** Requirements are long; four is what someone rereads before the real one. */
const UNCOVERED_COUNT = 4
/**
 * Below this share of its own words, a requirement counts as barely touched.
 *
 * A single shared word is not coverage: "Expérience avec Salesforce Marketing
 * Cloud" hangs on Salesforce, and saying "marketing" once would otherwise
 * hide the whole gap.
 */
const COVERAGE_RATIO = 0.5

export type InterviewInsights = {
  sessionCount: number
  /** The most recent report: what the candidate sounds like today. */
  latest: InterviewReport
  latestScore: number
  bestScore: number
  /** Latest minus first, 0 with a single session. */
  scoreDelta: number
  /** The weakest dimensions of the latest session, worst first. */
  focus: InterviewReportMetric[]
  /**
   * The offer's requirements the sessions barely touched, least covered
   * first, in the offer's own words.
   */
  weakRequirements: string[]
  /** Keyword coverage of the latest session, as the report measured it. */
  keywordCoverage: number
}

/**
 * Mirrors `normalizeToken` in `apps/api/src/interview/interview.stats.ts`.
 *
 * It has to: the keywords a report lists as mentioned were produced by that
 * function, and a requirement is matched against them here. Any drift and the
 * two stop lining up — change both or neither.
 */
function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
}

/** Tokens of four characters or more: short words carry no signal. */
function tokensOf(value: string) {
  return normalizeToken(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10
}

/**
 * How much of a requirement came up across the sessions, 0-1.
 *
 * Null when the line has no word long enough to match on: a three-letter
 * requirement is not evidence of a gap, it is just unmeasurable.
 */
function coverageOf(requirement: string, mentioned: Set<string>) {
  const tokens = tokensOf(requirement)
  if (tokens.length === 0) return null

  const hits = tokens.filter((token) => mentioned.has(token)).length

  return hits / tokens.length
}

/**
 * What the interviews say about this application specifically.
 *
 * Built from the reports the offer already carries — each finished session
 * appends one — so this costs no extra request. Null when nothing has been
 * practised yet: the page then invites a first session rather than showing an
 * empty scorecard.
 */
export function buildInterviewInsights(
  reports: InterviewReport[] | undefined,
  extracted: Pick<ExtractedOfferFields, "requirements">
): InterviewInsights | null {
  if (!reports || reports.length === 0) return null

  // Oldest first, so "delta" reads as where they ended minus where they began.
  const ordered = [...reports].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  )
  const latest = ordered[ordered.length - 1]!
  const first = ordered[0]!

  const mentioned = new Set(
    ordered.flatMap((report) => report.transcriptStats.keywordMentions)
  )
  const weakRequirements = extracted.requirements
    .map((requirement) => ({
      coverage: coverageOf(requirement, mentioned),
      requirement,
    }))
    .filter(
      (entry): entry is { coverage: number; requirement: string } =>
        entry.coverage !== null && entry.coverage < COVERAGE_RATIO
    )
    .sort((left, right) => left.coverage - right.coverage)
    .slice(0, UNCOVERED_COUNT)
    .map((entry) => entry.requirement)

  const focus = [...latest.metrics]
    .filter((metric) => metric.score < FOCUS_THRESHOLD)
    .sort((left, right) => left.score - right.score)
    .slice(0, FOCUS_COUNT)

  return {
    bestScore: Math.max(...ordered.map((report) => report.overallScore)),
    focus,
    keywordCoverage: latest.transcriptStats.keywordCoverage,
    latest,
    latestScore: latest.overallScore,
    scoreDelta: roundToTenth(latest.overallScore - first.overallScore),
    sessionCount: ordered.length,
    weakRequirements,
  }
}

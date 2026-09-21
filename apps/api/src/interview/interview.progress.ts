import type {
  InterviewMetricTrend,
  InterviewMetricTrendPoint,
  InterviewProgressSummary,
  InterviewReport,
  InterviewReportMetricKey,
} from "@cvforge/types";

/** How many finished sessions a trend looks back over. */
export const PROGRESS_WINDOW = 10;

/** At or above this mean, a metric counts as a strength. */
const STRENGTH_THRESHOLD = 7;
/** Below this mean, a metric counts as a weakness. */
const WEAKNESS_THRESHOLD = 6;
/** How many of each to surface — a list of five is a report, not a takeaway. */
const HIGHLIGHT_COUNT = 2;

/**
 * Declared rather than derived from the data, so a metric missing from every
 * report still appears (with no points) instead of vanishing silently, and so
 * ties break in a stable order.
 */
const METRIC_KEYS: InterviewReportMetricKey[] = [
  "clarity",
  "keywords",
  "pacing",
  "hesitations",
  "relevance",
];

const FALLBACK_LABELS: Record<InterviewReportMetricKey, string> = {
  clarity: "Clarté",
  keywords: "Mots-clés",
  pacing: "Rythme",
  hesitations: "Hésitations",
  relevance: "Pertinence",
};

export interface ScoredSession {
  completedAt: string;
  report: InterviewReport;
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

/** Oldest first, so a delta reads as "where they ended minus where they began". */
function chronological(sessions: ScoredSession[]) {
  return [...sessions].sort((left, right) =>
    left.completedAt.localeCompare(right.completedAt),
  );
}

function buildTrend(
  key: InterviewReportMetricKey,
  sessions: ScoredSession[],
): InterviewMetricTrend {
  const points: InterviewMetricTrendPoint[] = [];
  let label = FALLBACK_LABELS[key];

  for (const session of sessions) {
    const metric = session.report.metrics.find((entry) => entry.key === key);
    if (!metric) continue;

    if (metric.label) label = metric.label;
    points.push({ completedAt: session.completedAt, score: metric.score });
  }

  const scores = points.map((point) => point.score);

  return {
    key,
    label,
    average: scores.length === 0 ? 0 : roundToTenth(mean(scores)),
    delta:
      scores.length < 2
        ? 0
        : roundToTenth(scores[scores.length - 1]! - scores[0]!),
    points,
  };
}

/**
 * Summarises a candidate's recent finished sessions: how each metric moved,
 * and which ones consistently carry or hold them back.
 *
 * Pure on purpose. The metrics live inside a `jsonb` column, so averaging them
 * in SQL would mean `jsonb_array_elements` and a query no one can read or test
 * without a database — for a window the retention policy caps at a few dozen
 * rows anyway.
 */
export function aggregateInterviewProgress(
  sessions: ScoredSession[],
): InterviewProgressSummary {
  // Newest first on the way in, so the window keeps the most recent ones.
  const window = chronological(
    [...sessions]
      .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
      .slice(0, PROGRESS_WINDOW),
  );

  const overallScorePoints = window.map((session) => ({
    completedAt: session.completedAt,
    score: session.report.overallScore,
  }));
  const overallScores = overallScorePoints.map((point) => point.score);
  const metrics = METRIC_KEYS.map((key) => buildTrend(key, window));
  const measured = metrics.filter((metric) => metric.points.length > 0);

  return {
    sessionCount: window.length,
    overallScoreAverage:
      overallScores.length === 0 ? null : roundToTenth(mean(overallScores)),
    overallScoreDelta:
      overallScores.length < 2
        ? 0
        : roundToTenth(
            overallScores[overallScores.length - 1]! - overallScores[0]!,
          ),
    overallScorePoints,
    metrics,
    strengths: measured
      .filter((metric) => metric.average >= STRENGTH_THRESHOLD)
      .sort((left, right) => right.average - left.average)
      .slice(0, HIGHLIGHT_COUNT),
    weaknesses: measured
      .filter((metric) => metric.average < WEAKNESS_THRESHOLD)
      .sort((left, right) => left.average - right.average)
      .slice(0, HIGHLIGHT_COUNT),
  };
}

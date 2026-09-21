import type { InterviewReport, InterviewReportMetricKey } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import {
  PROGRESS_WINDOW,
  aggregateInterviewProgress,
  type ScoredSession,
} from "./interview.progress";

const ALL_KEYS: InterviewReportMetricKey[] = [
  "clarity",
  "keywords",
  "pacing",
  "hesitations",
  "relevance",
];

function makeReport(
  overallScore: number,
  scores: Partial<Record<InterviewReportMetricKey, number>> = {},
): InterviewReport {
  return {
    createdAt: "2026-04-24T13:00:00.000Z",
    improvements: [],
    metrics: ALL_KEYS.filter((key) => scores[key] !== undefined).map((key) => ({
      detail: "",
      key,
      label: key,
      score: scores[key]!,
    })),
    overallScore,
    summary: "",
    transcriptStats: {
      averageResponseDurationSeconds: 10,
      hesitationCount: 0,
      keywordCoverage: 0,
      keywordMentions: [],
      responseCount: 1,
    },
  };
}

function session(day: number, report: InterviewReport): ScoredSession {
  return {
    completedAt: `2026-04-${String(day).padStart(2, "0")}T10:00:00.000Z`,
    report,
  };
}

const trend = (summary: ReturnType<typeof aggregateInterviewProgress>, key: string) =>
  summary.metrics.find((metric) => metric.key === key)!;

describe("aggregateInterviewProgress", () => {
  it("reports nothing measurable when there are no sessions", () => {
    const summary = aggregateInterviewProgress([]);

    expect(summary.sessionCount).toBe(0);
    expect(summary.overallScoreAverage).toBeNull();
    expect(summary.overallScoreDelta).toBe(0);
    expect(summary.overallScorePoints).toEqual([]);
    expect(summary.strengths).toEqual([]);
    expect(summary.weaknesses).toEqual([]);
    // Every metric still appears, so the UI renders an empty chart, not a hole.
    expect(summary.metrics.map((metric) => metric.key)).toEqual(ALL_KEYS);
  });

  it("has no delta to report from a single session", () => {
    const summary = aggregateInterviewProgress([
      session(1, makeReport(7, { clarity: 8 })),
    ]);

    expect(summary.sessionCount).toBe(1);
    expect(summary.overallScoreAverage).toBe(7);
    expect(summary.overallScoreDelta).toBe(0);
    expect(trend(summary, "clarity").delta).toBe(0);
  });

  it("measures progress oldest to newest, whatever order they arrive in", () => {
    const summary = aggregateInterviewProgress([
      session(3, makeReport(8, { clarity: 9 })),
      session(1, makeReport(4, { clarity: 3 })),
      session(2, makeReport(6, { clarity: 6 })),
    ]);

    expect(summary.overallScoreAverage).toBe(6);
    expect(summary.overallScoreDelta).toBe(4); // 8 - 4
    expect(trend(summary, "clarity").delta).toBe(6); // 9 - 3
    expect(summary.overallScorePoints.map((point) => point.score)).toEqual([
      4, 6, 8,
    ]);
  });

  it("looks back only over the most recent sessions", () => {
    const sessions = Array.from({ length: PROGRESS_WINDOW + 5 }, (_, i) =>
      session(i + 1, makeReport(i + 1 > 10 ? 10 : i + 1)),
    );

    const summary = aggregateInterviewProgress(sessions);

    expect(summary.sessionCount).toBe(PROGRESS_WINDOW);
    // The five oldest are out of the window.
    expect(summary.overallScorePoints).toHaveLength(PROGRESS_WINDOW);
    expect(summary.overallScorePoints[0]?.completedAt).toContain("2026-04-06");
  });

  it("surfaces the two strongest and the two weakest metrics", () => {
    const summary = aggregateInterviewProgress([
      session(
        1,
        makeReport(6, {
          clarity: 9,
          keywords: 8,
          pacing: 5,
          hesitations: 2,
          relevance: 6,
        }),
      ),
    ]);

    expect(summary.strengths.map((metric) => metric.key)).toEqual([
      "clarity",
      "keywords",
    ]);
    expect(summary.weaknesses.map((metric) => metric.key)).toEqual([
      "hesitations",
      "pacing",
    ]);
    // 6 is neither: it sits between the two thresholds.
    expect(
      [...summary.strengths, ...summary.weaknesses].map((m) => m.key),
    ).not.toContain("relevance");
  });

  it("ignores a metric no report ever scored rather than calling it a weakness", () => {
    const summary = aggregateInterviewProgress([
      session(1, makeReport(7, { clarity: 8 })),
    ]);

    expect(trend(summary, "pacing").points).toEqual([]);
    expect(summary.weaknesses).toEqual([]);
  });

  it("averages a metric only over the sessions that scored it", () => {
    const summary = aggregateInterviewProgress([
      session(1, makeReport(7, { clarity: 4 })),
      session(2, makeReport(7, {})),
      session(3, makeReport(7, { clarity: 7 })),
    ]);

    expect(trend(summary, "clarity").points).toHaveLength(2);
    expect(trend(summary, "clarity").average).toBe(5.5);
  });

  it("rounds averages to one decimal rather than showing a full float", () => {
    const summary = aggregateInterviewProgress([
      session(1, makeReport(7)),
      session(2, makeReport(8)),
      session(3, makeReport(8)),
    ]);

    expect(summary.overallScoreAverage).toBe(7.7);
  });
});

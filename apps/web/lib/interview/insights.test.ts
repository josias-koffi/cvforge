import type { InterviewReport } from "@cvforge/types"
import { describe, expect, it } from "vitest"

import { buildInterviewInsights } from "@/lib/interview/insights"

function makeReport(overrides: Partial<InterviewReport> = {}): InterviewReport {
  return {
    createdAt: "2026-04-24T10:00:00.000Z",
    improvements: ["Structurer les réponses en STAR."],
    metrics: [
      { detail: "Propos clairs.", key: "clarity", label: "Clarté", score: 8 },
      { detail: "Trop de blancs.", key: "pacing", label: "Rythme", score: 4 },
      { detail: "Hors sujet.", key: "relevance", label: "Pertinence", score: 5 },
    ],
    overallScore: 6,
    summary: "Correct.",
    transcriptStats: {
      averageResponseDurationSeconds: 20,
      hesitationCount: 2,
      keywordCoverage: 40,
      keywordMentions: ["marketing"],
      responseCount: 4,
    },
    ...overrides,
  }
}

const OFFER = {
  requirements: [
    "Maîtrise du marketing digital",
    "Expérience avec Salesforce Marketing Cloud",
    "Anglais courant",
  ],
}

describe("buildInterviewInsights", () => {
  it("says nothing before a first interview", () => {
    expect(buildInterviewInsights([], OFFER)).toBeNull()
    expect(buildInterviewInsights(undefined, OFFER)).toBeNull()
  })

  it("reads the latest session and measures it against the first", () => {
    const insights = buildInterviewInsights(
      [
        makeReport({ createdAt: "2026-04-20T10:00:00.000Z", overallScore: 4 }),
        makeReport({ createdAt: "2026-04-24T10:00:00.000Z", overallScore: 7 }),
      ],
      OFFER
    )

    expect(insights?.sessionCount).toBe(2)
    expect(insights?.latestScore).toBe(7)
    expect(insights?.bestScore).toBe(7)
    expect(insights?.scoreDelta).toBe(3)
  })

  it("keeps the best score even when the last session was worse", () => {
    const insights = buildInterviewInsights(
      [
        makeReport({ createdAt: "2026-04-20T10:00:00.000Z", overallScore: 8 }),
        makeReport({ createdAt: "2026-04-24T10:00:00.000Z", overallScore: 5 }),
      ],
      OFFER
    )

    expect(insights?.bestScore).toBe(8)
    expect(insights?.scoreDelta).toBe(-3)
  })

  it("names the weakest dimensions of the latest session, worst first", () => {
    const insights = buildInterviewInsights([makeReport()], OFFER)

    expect(insights?.focus.map((metric) => metric.key)).toEqual([
      "pacing",
      "relevance",
    ])
  })

  it("leaves the focus empty when nothing scored low", () => {
    const insights = buildInterviewInsights(
      [
        makeReport({
          metrics: [
            { detail: "Net.", key: "clarity", label: "Clarté", score: 9 },
          ],
        }),
      ],
      OFFER
    )

    expect(insights?.focus).toEqual([])
  })

  it("lists the requirements the sessions barely touched, least covered first", () => {
    const insights = buildInterviewInsights([makeReport()], OFFER)

    // Only "marketing" was ever said: nothing of "Anglais courant", one word
    // in five of the Salesforce line, one in three of the first.
    expect(insights?.weakRequirements).toEqual([
      "Anglais courant",
      "Expérience avec Salesforce Marketing Cloud",
      "Maîtrise du marketing digital",
    ])
  })

  it("pools the keywords of every session, not just the last", () => {
    const insights = buildInterviewInsights(
      [
        makeReport({
          createdAt: "2026-04-20T10:00:00.000Z",
          transcriptStats: {
            ...makeReport().transcriptStats,
            keywordMentions: ["anglais"],
          },
        }),
        makeReport({ createdAt: "2026-04-24T10:00:00.000Z" }),
      ],
      OFFER
    )

    // "Anglais courant" is half said once "anglais" comes up in the first
    // session, so it drops out; the two long requirements stay.
    expect(insights?.weakRequirements).toEqual([
      "Expérience avec Salesforce Marketing Cloud",
      "Maîtrise du marketing digital",
    ])
  })
})

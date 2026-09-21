import type { InterviewReport, InterviewTranscriptStats } from "@cvforge/types"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ReportCard } from "@/components/interview/report/report-card"
import { TranscriptStats } from "@/components/interview/report/transcript-stats"

/** React escapes apostrophes, which French labels are full of. */
const render = (element: React.ReactElement) =>
  renderToStaticMarkup(element).replaceAll("&#x27;", "'")

const STATS: InterviewTranscriptStats = {
  averageResponseDurationSeconds: 14,
  hesitationCount: 3,
  keywordCoverage: 60,
  keywordMentions: ["typescript", "postgres"],
  responseCount: 5,
}

function makeReport(overrides: Partial<InterviewReport> = {}): InterviewReport {
  return {
    createdAt: "2026-04-24T13:30:00.000Z",
    improvements: ["Structurer les réponses en STAR."],
    metrics: [
      { detail: "Propos clairs.", key: "clarity", label: "Clarté", score: 8 },
    ],
    overallScore: 7,
    summary: "Session solide, quelques longueurs.",
    transcriptStats: STATS,
    ...overrides,
  }
}

describe("ReportCard", () => {
  it("shows the score, the summary and what to work on", () => {
    const markup = render(<ReportCard report={makeReport()} />)

    expect(markup).toContain("7")
    expect(markup).toContain("/10")
    expect(markup).toContain("Session solide, quelques longueurs.")
    expect(markup).toContain("Structurer les réponses en STAR.")
  })

  it("states the verdict in words, not by colour alone", () => {
    expect(render(<ReportCard report={makeReport({ overallScore: 9 })} />)).toContain(
      "Point fort"
    )
    expect(render(<ReportCard report={makeReport({ overallScore: 3 })} />)).toContain(
      "À travailler"
    )
  })

  it("omits the advice section when there is none", () => {
    const markup = render(<ReportCard report={makeReport({ improvements: [] })} />)

    expect(markup).not.toContain("À travailler en priorité")
  })
})

describe("TranscriptStats", () => {
  it("reports the measured facts", () => {
    const markup = render(<TranscriptStats hasLinkedOffer stats={STATS} />)

    expect(markup).toContain("5") // responses
    expect(markup).toContain("14 s")
    expect(markup).toContain("60 %")
    expect(markup).toContain("typescript, postgres")
  })

  it("shows no coverage figure when there is no offer to measure against", () => {
    // A flat 0 would read as a bad score rather than as no score at all.
    const markup = render(
      <TranscriptStats
        hasLinkedOffer={false}
        stats={{ ...STATS, keywordCoverage: 0, keywordMentions: [] }}
      />
    )

    expect(markup).not.toContain("0 %")
    expect(markup).toContain("—")
  })

  it("handles an unmeasurable average duration", () => {
    const markup = render(
      <TranscriptStats
        hasLinkedOffer
        stats={{ ...STATS, averageResponseDurationSeconds: null }}
      />
    )

    expect(markup).toContain("—")
  })
})

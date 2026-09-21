import {
  interviewRecruiterProfiles,
  supportedLocales,
  type InterviewSessionStatus,
} from "@cvforge/types"
import { describe, expect, it } from "vitest"

import {
  formatDelta,
  languageLabels,
  metricLabels,
  profileHints,
  profileLabels,
  scoreVerdict,
  sessionStatusLabels,
  sessionStatusVariants,
  vadStatusLabels,
} from "@/lib/interview/labels"

const STATUSES: InterviewSessionStatus[] = [
  "idle",
  "recording",
  "ready",
  "completed",
  "error",
]

describe("interview labels", () => {
  it("names and describes every recruiter profile", () => {
    for (const profile of interviewRecruiterProfiles) {
      expect(profileLabels[profile]).toBeTruthy()
      expect(profileHints[profile]).toBeTruthy()
    }

    // Distinct, so the wizard never shows the same card twice.
    expect(new Set(Object.values(profileLabels)).size).toBe(
      interviewRecruiterProfiles.length
    )
  })

  it("names and styles every session status", () => {
    for (const status of STATUSES) {
      expect(sessionStatusLabels[status]).toBeTruthy()
      expect(sessionStatusVariants[status]).toBeTruthy()
    }
  })

  it("names every supported language and every report metric", () => {
    for (const locale of supportedLocales) {
      expect(languageLabels[locale]).toBeTruthy()
    }

    expect(Object.keys(metricLabels)).toEqual([
      "clarity",
      "keywords",
      "pacing",
      "hesitations",
      "relevance",
    ])
  })

  it("names every microphone state", () => {
    expect(Object.keys(vadStatusLabels)).toEqual([
      "listening",
      "recording",
      "processing",
      "muted",
    ])
  })
})

describe("scoreVerdict", () => {
  it("puts a score in words, so colour is never the only cue", () => {
    expect(scoreVerdict(10)).toBe("Point fort")
    expect(scoreVerdict(8)).toBe("Point fort")
    expect(scoreVerdict(7)).toBe("Correct")
    expect(scoreVerdict(6)).toBe("Correct")
    expect(scoreVerdict(5)).toBe("À travailler")
    expect(scoreVerdict(0)).toBe("À travailler")
  })
})

describe("formatDelta", () => {
  it("always carries a sign, so an arrow is never load-bearing", () => {
    expect(formatDelta(1.5)).toBe("+1.5")
    expect(formatDelta(-2)).toBe("−2.0")
  })

  it("says stable rather than showing a signed zero", () => {
    expect(formatDelta(0)).toBe("stable")
  })
})

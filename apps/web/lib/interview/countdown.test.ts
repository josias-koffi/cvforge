import { describe, expect, it } from "vitest"

import {
  AUTO_FINISH_GRACE_SECONDS,
  elapsedSeconds,
  formatDuration,
  resolveCountdown,
  shouldAutoFinish,
} from "@/lib/interview/countdown"

describe("elapsedSeconds", () => {
  it("is zero before the first spoken turn", () => {
    // Credits are spent when the session opens, which can be minutes earlier.
    expect(elapsedSeconds(null, Date.now())).toBe(0)
  })

  it("counts from the moment the interview actually began", () => {
    const started = "2026-09-21T10:00:00.000Z"

    expect(elapsedSeconds(started, Date.parse("2026-09-21T10:03:20.000Z"))).toBe(
      200
    )
  })

  it("survives a reload: the same instant gives the same elapsed", () => {
    const started = "2026-09-21T10:00:00.000Z"
    const now = Date.parse("2026-09-21T10:07:00.000Z")

    expect(elapsedSeconds(started, now)).toBe(elapsedSeconds(started, now))
  })

  it("ignores an unparsable timestamp rather than showing NaN", () => {
    expect(elapsedSeconds("hier", Date.now())).toBe(0)
  })

  it("never goes negative when the clocks disagree", () => {
    expect(
      elapsedSeconds("2026-09-21T10:05:00.000Z", Date.parse("2026-09-21T10:00:00.000Z"))
    ).toBe(0)
  })
})

describe("formatDuration", () => {
  it("pads both halves", () => {
    expect(formatDuration(65)).toBe("01:05")
    expect(formatDuration(0)).toBe("00:00")
  })

  it("counts past an hour rather than wrapping round", () => {
    expect(formatDuration(3_725)).toBe("62:05")
  })

  it("floors a negative to zero", () => {
    expect(formatDuration(-10)).toBe("00:00")
  })
})

describe("resolveCountdown", () => {
  it("counts down from the chosen duration", () => {
    expect(resolveCountdown(0, 10)).toEqual({
      label: "10:00",
      remainingSeconds: 600,
      tone: "running",
    })
  })

  it("warns in the last minute, when the recruiter starts closing", () => {
    expect(resolveCountdown(9 * 60 + 1, 10).tone).toBe("wrapup")
    expect(resolveCountdown(9 * 60 - 1, 10).tone).toBe("running")
  })

  it("keeps counting past the end rather than stopping the interview", () => {
    // Nothing cuts the candidate off: the recruiter wraps up and they finish
    // when they choose.
    const over = resolveCountdown(11 * 60, 10)

    expect(over.tone).toBe("overtime")
    expect(over.label).toBe("+01:00")
    expect(over.remainingSeconds).toBe(0)
  })

  it("flips to overtime exactly on the mark", () => {
    expect(resolveCountdown(10 * 60, 10).tone).toBe("overtime")
  })

  it("handles each offered duration", () => {
    for (const minutes of [10, 20, 30]) {
      expect(resolveCountdown(0, minutes).label).toBe(`${minutes}:00`)
    }
  })
})

describe("shouldAutoFinish", () => {
  const spent = 10 * 60 + AUTO_FINISH_GRACE_SECONDS

  /** A ten-minute interview, past its deadline, in a gap between turns. */
  function ready(overrides: Partial<Parameters<typeof shouldAutoFinish>[0]> = {}) {
    return shouldAutoFinish({
      durationMinutes: 10,
      elapsed: spent,
      finishing: false,
      hasAnswered: true,
      phase: "listening",
      ...overrides,
    })
  }

  it("scores the interview once the time is spent", () => {
    expect(ready()).toBe(true)
  })

  it("leaves a grace period for the closing exchange", () => {
    expect(ready({ elapsed: 10 * 60 })).toBe(false)
    expect(ready({ elapsed: spent - 1 })).toBe(false)
  })

  it("never stops a turn in progress", () => {
    // Ending here would throw away the answer and the credit that paid for it.
    for (const phase of ["recording", "processing", "speaking"]) {
      expect(ready({ phase })).toBe(false)
    }
  })

  it("does not score an interview nobody answered", () => {
    expect(ready({ hasAnswered: false })).toBe(false)
  })

  it("does not fire again while the report is being built", () => {
    expect(ready({ finishing: true })).toBe(false)
  })

  it("stays quiet before the clock has even started", () => {
    expect(ready({ elapsed: 0 })).toBe(false)
  })
})

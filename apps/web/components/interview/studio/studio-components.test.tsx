import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { LatencyStrip } from "@/components/interview/studio/latency-strip"
import { VoiceOrb } from "@/components/interview/studio/voice-orb"
import { orbStateLabels } from "@/lib/interview/labels"
import type { OrbState } from "@/lib/interview/orb"

/** React escapes apostrophes, which French labels are full of. */
const render = (element: React.ReactElement) =>
  renderToStaticMarkup(element).replaceAll("&#x27;", "'")

describe("VoiceOrb", () => {
  it("spells out every state, so it is not colour alone", () => {
    for (const state of Object.keys(orbStateLabels) as OrbState[]) {
      const markup = render(<VoiceOrb amplitude={0.4} state={state} />)

      expect(markup).toContain(orbStateLabels[state])
    }
  })

  it("announces the state politely for a screen reader", () => {
    const markup = render(<VoiceOrb amplitude={0} state="speaking" />)

    expect(markup).toContain('aria-live="polite"')
  })

  it("breathes on the live level and hides the sphere from assistive tech", () => {
    const loud = renderToStaticMarkup(
      <VoiceOrb amplitude={0.8} state="speaking" />
    )

    expect(loud).toContain("--amp:0.8")
    expect(loud).toContain('aria-hidden="true"')
  })

  it("colours the recruiter's voice and the candidate's differently", () => {
    const speaking = renderToStaticMarkup(
      <VoiceOrb amplitude={0.5} state="speaking" />
    )
    const recording = renderToStaticMarkup(
      <VoiceOrb amplitude={0.5} state="recording" />
    )

    expect(speaking).toContain("--orb:var(--chart-5)")
    expect(recording).toContain("--orb:var(--spark)")
  })
})

describe("LatencyStrip", () => {
  it("renders nothing before the first reply", () => {
    expect(render(<LatencyStrip firstTokenMs={null} />)).toBe("")
  })

  it("says in words whether the target was met, never by colour alone", () => {
    expect(render(<LatencyStrip firstTokenMs={800} />)).toContain(
      "dans la cible"
    )
    expect(render(<LatencyStrip firstTokenMs={2500} />)).toContain(
      "au-delà"
    )
  })

  it("reads the delay in seconds", () => {
    expect(render(<LatencyStrip firstTokenMs={1500} />)).toContain(
      "1.5 s"
    )
  })
})

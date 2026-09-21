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
      const markup = render(<VoiceOrb input={0.4} output={0} state={state} />)

      expect(markup).toContain(orbStateLabels[state])
    }
  })

  it("announces the state politely for a screen reader", () => {
    const markup = render(<VoiceOrb input={0} output={0.5} state="speaking" />)

    expect(markup).toContain('aria-live="polite"')
  })

  it("hides the sphere itself from assistive tech", () => {
    // It is decoration: the sentence below it carries the meaning.
    const markup = render(<VoiceOrb input={0} output={0} state="listening" />)

    expect(markup).toContain('aria-hidden="true"')
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

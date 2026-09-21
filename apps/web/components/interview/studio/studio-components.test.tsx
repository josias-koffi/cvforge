import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { LatencyStrip } from "@/components/interview/studio/latency-strip"
import { MicOrb } from "@/components/interview/studio/mic-orb"
import { vadStatusLabels } from "@/lib/interview/labels"
import type { VadStatus } from "@/lib/interview/vad"

/** React escapes apostrophes, which French labels are full of. */
const render = (element: React.ReactElement) =>
  renderToStaticMarkup(element).replaceAll("&#x27;", "'")

describe("MicOrb", () => {
  it("spells out every microphone state, so it is not colour alone", () => {
    for (const status of Object.keys(vadStatusLabels) as VadStatus[]) {
      const markup = render(<MicOrb level={0.4} status={status} />)

      expect(markup).toContain(vadStatusLabels[status])
    }
  })

  it("announces the state politely for a screen reader", () => {
    const markup = render(<MicOrb level={0} status="recording" />)

    expect(markup).toContain('aria-live="polite"')
  })

  it("shows the level halo only while recording, and hides it from assistive tech", () => {
    const recording = renderToStaticMarkup(
      <MicOrb level={1} status="recording" />
    )
    const listening = renderToStaticMarkup(
      <MicOrb level={1} status="listening" />
    )

    expect(recording).toContain("scale(1.35)")
    expect(recording).toContain('aria-hidden="true"')
    expect(listening).not.toContain("scale(")
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

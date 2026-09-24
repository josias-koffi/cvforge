import type { AcquisitionStep, AcquisitionTool } from "@cvforge/types"

import { trackToolEvent } from "@/lib/track"

type Track = typeof trackToolEvent

/**
 * The four steps of a free tool's funnel (US-131), in one place: each tool's
 * component calls these and nothing else, so what it reports is tested here
 * rather than through a DOM the landing's tests do not have (US-134).
 */
export function toolFunnel(
  tool: AcquisitionTool,
  locale: string,
  track: Track = trackToolEvent
) {
  const step = (name: AcquisitionStep) => () => track(tool, name, locale)

  return {
    viewed: step("view"),
    scanned: step("result"),
    ctaClicked: step("cta_click"),
    emailSubmitted: step("email_submitted"),
  }
}

export function atsFunnel(locale: string, track: Track = trackToolEvent) {
  return toolFunnel("ats", locale, track)
}

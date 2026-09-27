import type { AcquisitionStep, AcquisitionTool } from "@cvforge/types"

export const EVENTS_PATH = "/api/events"

/**
 * Counts one step of a free tool's funnel (US-131). Fire and forget: nothing
 * here may slow the page down or show the visitor an error.
 *
 * `sendBeacon` first, because it survives the navigation a call-to-action
 * click starts; `fetch` with `keepalive` where it is missing or refuses.
 */
export function trackToolEvent(
  tool: AcquisitionTool,
  step: AcquisitionStep,
  locale: string
) {
  const body = JSON.stringify({ locale, step, tool })

  try {
    const queued = navigator.sendBeacon?.(
      EVENTS_PATH,
      new Blob([body], { type: "application/json" })
    )

    if (queued) return

    void fetch(EVENTS_PATH, {
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "POST",
    }).catch(() => {})
  } catch {
    // Measuring must never break the tool it measures.
  }
}

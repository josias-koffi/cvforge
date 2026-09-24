import { afterEach, describe, expect, it, vi } from "vitest"

import { EVENTS_PATH, trackToolEvent } from "./track"

afterEach(() => {
  vi.unstubAllGlobals()
})

async function sentBody(blob: Blob) {
  return JSON.parse(await blob.text()) as unknown
}

describe("trackToolEvent", () => {
  it("queues the event as a beacon", async () => {
    const sendBeacon = vi.fn().mockReturnValue(true)
    const fetchMock = vi.fn()
    vi.stubGlobal("navigator", { sendBeacon })
    vi.stubGlobal("fetch", fetchMock)

    trackToolEvent("ats", "result", "en")

    const [path, blob] = sendBeacon.mock.calls[0]!
    expect(path).toBe(EVENTS_PATH)
    await expect(sentBody(blob)).resolves.toEqual({
      locale: "en",
      step: "result",
      tool: "ats",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("falls back to a keepalive fetch when the beacon is refused", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null))
    vi.stubGlobal("navigator", { sendBeacon: vi.fn().mockReturnValue(false) })
    vi.stubGlobal("fetch", fetchMock)

    trackToolEvent("ats", "view", "fr")

    expect(fetchMock).toHaveBeenCalledWith(
      EVENTS_PATH,
      expect.objectContaining({ keepalive: true, method: "POST" })
    )
  })

  it("falls back to fetch where there is no beacon at all", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null))
    vi.stubGlobal("navigator", {})
    vi.stubGlobal("fetch", fetchMock)

    trackToolEvent("ats", "view", "fr")

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  /** Measuring must never break the tool it measures. */
  it("swallows every failure", async () => {
    vi.stubGlobal("navigator", {
      sendBeacon: () => {
        throw new Error("blocked")
      },
    })

    expect(() => trackToolEvent("ats", "view", "fr")).not.toThrow()

    vi.stubGlobal("navigator", {})
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))

    expect(() => trackToolEvent("ats", "view", "fr")).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
})

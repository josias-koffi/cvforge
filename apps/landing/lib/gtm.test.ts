import { afterEach, describe, expect, it, vi } from "vitest"

import { isGtmId, loadGtm, revokeGtm } from "@/lib/gtm"

/** The bits of `document` the loader touches. */
function fakeDocument() {
  const scripts: Record<string, string>[] = []
  return {
    scripts,
    document: {
      createElement: () => ({}) as Record<string, string>,
      getElementById: (id: string) => scripts.find((s) => s.id === id) ?? null,
      head: { appendChild: (s: Record<string, string>) => scripts.push(s) },
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("isGtmId", () => {
  it("accepts a container id, and nothing else", () => {
    expect(isGtmId("GTM-AB12CD")).toBe(true)
    for (const value of [
      "pending",
      "",
      "G-AB12CD",
      "GTM-ab12",
      'GTM-1"><script>',
      null,
      42,
    ]) {
      expect(isGtmId(value)).toBe(false)
    }
  })
})

describe("loadGtm", () => {
  it("denies everything by default, grants measurement only, then loads the container once", () => {
    const win: { dataLayer?: unknown[] } = {}
    const { document, scripts } = fakeDocument()
    vi.stubGlobal("window", win)
    vi.stubGlobal("document", document)

    loadGtm("GTM-AB12CD")
    loadGtm("GTM-AB12CD")

    const pushed = win.dataLayer!.map((entry) =>
      entry && typeof entry === "object" && "length" in entry
        ? Array.from(entry as ArrayLike<unknown>)
        : entry
    )
    expect(pushed[0]).toEqual([
      "consent",
      "default",
      {
        ad_personalization: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        analytics_storage: "denied",
      },
    ])
    expect(pushed[1]).toEqual([
      "consent",
      "update",
      { analytics_storage: "granted" },
    ])
    expect(pushed[2]).toMatchObject({ event: "gtm.js" })
    expect(scripts).toHaveLength(1)
    expect(scripts[0]!.src).toBe(
      "https://www.googletagmanager.com/gtm.js?id=GTM-AB12CD"
    )

    revokeGtm()
    expect(Array.from(win.dataLayer!.at(-1) as ArrayLike<unknown>)).toEqual([
      "consent",
      "update",
      { analytics_storage: "denied" },
    ])
  })
})

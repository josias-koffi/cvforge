import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams("periode=90"),
  pathname: "/admin/metrics/revenus",
}))

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.params,
}))

const { MetricsNav } = await import("@/components/admin/metrics/metrics-nav")
const { PeriodToggle } =
  await import("@/components/admin/metrics/period-toggle")
const { ExportButton } =
  await import("@/components/admin/metrics/export-button")

describe("MetricsNav", () => {
  it("marks the open tab and keeps the period on every link", () => {
    const html = renderToStaticMarkup(<MetricsNav />)

    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toMatch(
      /aria-current="page"[^>]*href="\/admin\/metrics\/revenus\?periode=90"/
    )
    expect(html).toContain('href="/admin/metrics?periode=90"')
    expect(html).toContain('href="/admin/metrics/couts-ia?periode=90"')
    expect(html).toContain("Vue d&#x27;ensemble")
  })
})

describe("PeriodToggle", () => {
  it("links every period on the current tab and marks the chosen one", () => {
    const html = renderToStaticMarkup(<PeriodToggle />)

    expect(html).toContain('href="/admin/metrics/revenus?periode=7"')
    // The default period is the plain URL.
    expect(html).toContain('href="/admin/metrics/revenus"')
    expect(html).toContain('href="/admin/metrics/revenus?periode=all"')
    expect(html).toMatch(/aria-current="true"[^>]*>90 j</)
    expect(html.match(/aria-current/g)).toHaveLength(1)
  })
})

describe("ExportButton", () => {
  it("exports the period on screen", () => {
    expect(renderToStaticMarkup(<ExportButton />)).toContain(
      'href="/admin/metrics/export?periode=90"'
    )
  })
})

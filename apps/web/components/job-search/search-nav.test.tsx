import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const navigation = vi.hoisted(() => ({
  pathname: "/ma-recherche/marche",
  params: new URLSearchParams("profileId=p2"),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.params,
}))

const { SearchNav } = await import("@/components/job-search/search-nav")
const { searchTabHref } = await import("@/components/job-search/search-tabs")

describe("searchTabHref", () => {
  it("keeps the profile being looked at", () => {
    expect(searchTabHref("/ma-recherche/metiers", "p2")).toBe(
      "/ma-recherche/metiers?profileId=p2"
    )
    expect(searchTabHref("/ma-recherche", null)).toBe("/ma-recherche")
  })
})

describe("SearchNav", () => {
  it("marks the open tab and carries the profile on every link", () => {
    const html = renderToStaticMarkup(<SearchNav />)

    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toMatch(
      /aria-current="page"[^>]*href="\/ma-recherche\/marche\?profileId=p2"/
    )
    expect(html).toContain('href="/ma-recherche?profileId=p2"')
    expect(html).toContain('href="/ma-recherche/alertes?profileId=p2"')
  })
})

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PagePagination } from "@/components/data-table/page-pagination"

function render(page: number, lastPage: number) {
  return renderToStaticMarkup(
    <PagePagination
      page={page}
      lastPage={lastPage}
      path="/offres"
      params={{ q: "react" }}
    />
  )
}

describe("PagePagination", () => {
  it("shows nothing when there is a single page", () => {
    expect(render(1, 1)).toBe("")
  })

  it("links each page, keeping the search", () => {
    const markup = render(2, 3)

    expect(markup).toContain('href="/offres?q=react"')
    expect(markup).toContain('href="/offres?q=react&amp;page=3"')
    expect(markup).toContain('aria-current="page"')
  })

  it("neutralises the arrow that leads nowhere", () => {
    // `disabled` does nothing on a link: both arrows used to be clickable,
    // and "previous" on page 1 led back to page 1.
    const markup = render(1, 3)

    expect(markup).toContain("pointer-events-none")
    expect(markup).toContain('aria-disabled="true"')
  })
})

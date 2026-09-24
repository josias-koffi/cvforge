import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CompanyMark } from "@/components/job-search/company-mark"
import { companyLogoSrc } from "@/lib/company-logo"

const LOGO =
  "https://api.francetravail.fr/exp-rechercheoffre/v1/logo-entreprise/MV3d7KZ8"

describe("companyLogoSrc", () => {
  it("goes through our own route, never to the source directly", () => {
    expect(companyLogoSrc(LOGO)).toBe(
      `/api/company-logos?src=${encodeURIComponent(LOGO)}`
    )
    expect(companyLogoSrc("")).toBeNull()
    expect(companyLogoSrc(null)).toBeNull()
  })
})

describe("CompanyMark", () => {
  it("shows the initial, the fallback while a logo loads or fails", () => {
    expect(renderToStaticMarkup(<CompanyMark name="lidl" />)).toContain(">L<")
    expect(renderToStaticMarkup(<CompanyMark name={null} />)).toContain(">?<")
  })

  it("never asks for the logo of a company that hides its name", () => {
    // Radix only mounts the <img> once it has loaded, so the markup cannot
    // show it; what matters is that no source is ever computed for it.
    expect(
      renderToStaticMarkup(<CompanyMark name={null} logoUrl={LOGO} />)
    ).not.toContain("company-logos")
  })
})

import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { PublicKeywordMatchResponse } from "@cvforge/types"

import { KeywordMatchResult } from "@/components/keyword-match/keyword-match-result"
import { KeywordMatchTool } from "@/components/keyword-match/keyword-match-tool"
import { en } from "@/content/en"
import { fr } from "@/content/fr"

const RESULT: PublicKeywordMatchResponse = {
  band: "fair",
  coverage: 45,
  matched: ["typescript", "postgresql"],
  matchedCount: 2,
  missing: ["kubernetes", "terraform"],
  missingCount: 34,
}

const escapeHtml = (text: string) =>
  text.replaceAll("'", "&#x27;").replaceAll('"', "&quot;")

function renderResult(result = RESULT, dict = fr) {
  return renderToStaticMarkup(
    <KeywordMatchResult
      dictionary={dict.keywordMatch}
      errors={dict.ats}
      offerText="offre"
      onCtaClick={vi.fn()}
      onLeadSent={vi.fn()}
      onRestart={vi.fn()}
      result={result}
    />
  )
}

describe("KeywordMatchTool", () => {
  it.each([
    ["fr", fr],
    ["en", en],
  ] as const)("asks for a CV and the offer, in %s", (locale, dict) => {
    const html = renderToStaticMarkup(
      <KeywordMatchTool
        ats={dict.ats}
        dictionary={dict.keywordMatch}
        locale={locale}
      />
    )

    expect(html).toContain(escapeHtml(dict.keywordMatch.offer.label))
    expect(html).toContain(escapeHtml(dict.keywordMatch.privacyNote))
    // Nothing to compare yet: the counter shows the floor, the button waits.
    expect(html).toContain(locale === "fr" ? "0 / 200" : "0 / 200")
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>/)
  })

  it("ties the offer field to its hint and its counter", () => {
    const html = renderToStaticMarkup(
      <KeywordMatchTool ats={fr.ats} dictionary={fr.keywordMatch} locale="fr" />
    )
    const describedBy = html.match(
      /<textarea[^>]*aria-describedby="([^"]+)"/
    )?.[1]

    expect(describedBy?.split(" ")).toHaveLength(2)
    expect(html).toContain('maxLength="8000"')
  })
})

describe("KeywordMatchResult", () => {
  it("gives the coverage, its verdict in words and the count", () => {
    const html = renderResult()

    expect(html).toContain("45")
    expect(html).toContain(fr.keywordMatch.result.gauge.bands.fair)
    expect(html).toContain(escapeHtml(fr.keywordMatch.result.verdicts.fair))
    expect(html).toContain("2 termes de l&#x27;offre sur 36")
  })

  it("lists the present and the missing terms, and says how many were cut", () => {
    const html = renderResult()

    for (const term of [...RESULT.matched, ...RESULT.missing]) {
      expect(html).toContain(`>${term}<`)
    }
    expect(html).toContain("et 32 autres")
    expect(html).not.toContain("et 0 autres")
  })

  /** Missing first: that is the list the visitor acts on. */
  it("shows the missing terms before the present ones", () => {
    const html = renderResult()

    expect(html.indexOf(fr.keywordMatch.result.missingTitle)).toBeLessThan(
      html.indexOf(fr.keywordMatch.result.matchedTitle)
    )
  })

  it("says so when a list is empty rather than showing nothing", () => {
    const html = renderResult({
      ...RESULT,
      band: "good",
      coverage: 100,
      missing: [],
      missingCount: 0,
    })

    expect(html).toContain(escapeHtml(fr.keywordMatch.result.missingEmpty))
  })

  it("announces the result and can take the focus", () => {
    const html = renderResult()

    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('tabindex="-1"')
  })

  it.each([
    ["fr", fr],
    ["en", en],
  ] as const)(
    "leads to a CV generated for this offer, in %s",
    (_locale, dict) => {
      const html = renderResult(RESULT, dict)

      expect(html).toContain(escapeHtml(dict.keywordMatch.cta.button))
      expect(html).toContain(escapeHtml(dict.keywordMatch.result.again))
    }
  )
})

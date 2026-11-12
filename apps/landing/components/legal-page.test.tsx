import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { LegalPage } from "@/components/legal-page"

function render(body: string) {
  return renderToStaticMarkup(
    <LegalPage
      locale="fr"
      updatedLabel="Mis à jour le"
      document={{
        body: { en: "", fr: body },
        publishedAt: "2026-11-12T00:00:00.000Z",
        slug: "privacy",
        title: { en: "Privacy", fr: "Confidentialité" },
        version: 1,
      }}
    />
  )
}

describe("LegalPage", () => {
  it("renders the links of the document as links", () => {
    const markup = render(
      "Saisir la [CNIL](https://www.cnil.fr) ou écrire à contact@jobspark.fr."
    )

    expect(markup).toContain('href="https://www.cnil.fr"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('href="mailto:contact@jobspark.fr"')
    expect(markup).not.toContain("[CNIL]")
  })

  it("renders bold, numbered lists and sub-headings", () => {
    const markup = render("### Vos droits\n\n1. **Accès**\n2. Effacement")

    expect(markup).toContain("<h3")
    expect(markup).toContain("<ol")
    expect(markup).toContain("<strong")
  })

  // Edited from the back-office: nothing in it may become markup or a script.
  it("never turns the text into HTML or a script link", () => {
    const markup = render(
      "<img src=x onerror=alert(1)> [clic](javascript:void)"
    )

    expect(markup).not.toContain("<img")
    expect(markup).not.toContain("javascript:")
    expect(markup).toContain("&lt;img")
  })
})

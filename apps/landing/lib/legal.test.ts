import { describe, expect, it } from "vitest"

import { legalPath, legalSlugFromPath, parseLegalBody } from "@/lib/legal"

describe("parseLegalBody", () => {
  it("reads headings, paragraphs and lists", () => {
    const blocks = parseLegalBody(
      [
        "Dernière mise à jour : 21 septembre 2026.",
        "",
        "## Le service",
        "",
        "CVSpark aide un candidat.",
        "",
        "- Sans mot de passe",
        "- Sans abonnement",
      ].join("\n")
    )

    expect(blocks).toEqual([
      { type: "paragraph", text: "Dernière mise à jour : 21 septembre 2026." },
      { type: "heading", text: "Le service" },
      { type: "paragraph", text: "CVSpark aide un candidat." },
      { type: "list", items: ["Sans mot de passe", "Sans abonnement"] },
    ])
  })

  it("joins the wrapped lines of one paragraph", () => {
    expect(parseLegalBody("Une phrase\ncoupée en deux.")).toEqual([
      { type: "paragraph", text: "Une phrase coupée en deux." },
    ])
  })

  it("closes a list when a paragraph follows it without a blank line", () => {
    expect(parseLegalBody("- Un point\nUn paragraphe.")).toEqual([
      { type: "list", items: ["Un point"] },
      { type: "paragraph", text: "Un paragraphe." },
    ])
  })

  it("ignores blank input", () => {
    expect(parseLegalBody("")).toEqual([])
    expect(parseLegalBody("\n\n   \n")).toEqual([])
  })

  // The body is editable from the back-office. Whatever it contains comes out
  // as text: the parser yields no markup, and the page renders React elements.
  it("treats raw HTML as text, never as markup", () => {
    expect(parseLegalBody("<script>alert(1)</script>")).toEqual([
      { type: "paragraph", text: "<script>alert(1)</script>" },
    ])
    expect(parseLegalBody("## <b>Titre</b>")).toEqual([
      { type: "heading", text: "<b>Titre</b>" },
    ])
  })
})

describe("legal paths", () => {
  it("serves each document under its own address per language", () => {
    expect(legalPath("fr", "terms")).toBe("/fr/legal/cgu")
    expect(legalPath("en", "terms")).toBe("/en/legal/terms")
    expect(legalPath("fr", "sales-terms")).toBe("/fr/legal/cgv")
    expect(legalPath("en", "privacy")).toBe("/en/legal/privacy")
  })

  it("resolves a segment written in either language", () => {
    expect(legalSlugFromPath("cgu")).toBe("terms")
    expect(legalSlugFromPath("terms")).toBe("terms")
    expect(legalSlugFromPath("mentions-legales")).toBe("legal-notice")
    expect(legalSlugFromPath("cookies")).toBeNull()
  })
})

import { describe, expect, it } from "vitest";
import { parseLegalBody, parseLegalInline, safeLegalHref } from "./legal-body";

describe("parseLegalBody", () => {
  it("reads sub-headings, numbered lists, quotes and separators", () => {
    expect(
      parseLegalBody(
        [
          "# Titre",
          "### Sous-titre",
          "1. Premier",
          "2) Second",
          "",
          "* Puce",
          "+ Autre puce",
          "",
          "> Une citation",
          "> sur deux lignes",
          "---",
          "Fin.",
        ].join("\n"),
      ),
    ).toEqual([
      { type: "heading", text: "Titre" },
      { type: "heading", text: "Sous-titre", level: 3 },
      { type: "list", items: ["Premier", "Second"], ordered: true },
      { type: "list", items: ["Puce", "Autre puce"] },
      { type: "quote", text: "Une citation sur deux lignes" },
      { type: "rule" },
      { type: "paragraph", text: "Fin." },
    ]);
  });

  it("splits a bulleted list from a numbered one that follows it", () => {
    expect(parseLegalBody("- a\n1. b")).toEqual([
      { type: "list", items: ["a"] },
      { type: "list", items: ["b"], ordered: true },
    ]);
  });
});

describe("parseLegalInline", () => {
  it("turns a markdown link into a link", () => {
    expect(
      parseLegalInline(
        "Saisir la [CNIL](https://www.cnil.fr/plaintes) en ligne.",
      ),
    ).toEqual([
      { type: "text", text: "Saisir la " },
      {
        type: "link",
        href: "https://www.cnil.fr/plaintes",
        children: [{ type: "text", text: "CNIL" }],
      },
      { type: "text", text: " en ligne." },
    ]);
  });

  it("links a bare address, leaving the sentence's full stop outside", () => {
    expect(parseLegalInline("Voir https://www.cnil.fr.")).toEqual([
      { type: "text", text: "Voir " },
      {
        type: "link",
        href: "https://www.cnil.fr",
        children: [{ type: "text", text: "https://www.cnil.fr" }],
      },
      { type: "text", text: "." },
    ]);
  });

  it("links an e-mail address, bare or between angle brackets", () => {
    const expected = {
      type: "link",
      href: "mailto:contact@jobspark.fr",
      children: [{ type: "text", text: "contact@jobspark.fr" }],
    };

    expect(parseLegalInline("Écrire à contact@jobspark.fr.")).toEqual([
      { type: "text", text: "Écrire à " },
      expected,
      { type: "text", text: "." },
    ]);
    expect(parseLegalInline("<contact@jobspark.fr>")).toEqual([expected]);
  });

  it("reads bold and italics, nested in a link too", () => {
    expect(parseLegalInline("**Important** et *rare* et __gras__")).toEqual([
      { type: "strong", children: [{ type: "text", text: "Important" }] },
      { type: "text", text: " et " },
      { type: "emphasis", children: [{ type: "text", text: "rare" }] },
      { type: "text", text: " et " },
      { type: "strong", children: [{ type: "text", text: "gras" }] },
    ]);
    expect(parseLegalInline("[**CGV**](/fr/legal/cgv)")).toEqual([
      {
        type: "link",
        href: "/fr/legal/cgv",
        children: [
          { type: "strong", children: [{ type: "text", text: "CGV" }] },
        ],
      },
    ]);
  });

  it("keeps the parentheses of an address inside the link", () => {
    expect(
      parseLegalInline("[RGPD](https://fr.wikipedia.org/wiki/RGPD_(UE)) puis"),
    ).toEqual([
      {
        type: "link",
        href: "https://fr.wikipedia.org/wiki/RGPD_(UE)",
        children: [{ type: "text", text: "RGPD" }],
      },
      { type: "text", text: " puis" },
    ]);
    expect(parseLegalInline("[clic](javascript:alert(1)).")).toEqual([
      { type: "text", text: "clic." },
    ]);
  });

  it("leaves snake_case and lone stars alone", () => {
    expect(parseLegalInline("la variable user_email et 2 * 3")).toEqual([
      { type: "text", text: "la variable user_email et 2 * 3" },
    ]);
  });

  // The body is editable from the back-office: no target may run code, and
  // no HTML comes out as markup.
  it("keeps the label of a link to a dangerous target, without the link", () => {
    expect(parseLegalInline("[clic](javascript:void)")).toEqual([
      { type: "text", text: "clic" },
    ]);
    expect(parseLegalInline("<b>gras</b>")).toEqual([
      { type: "text", text: "<b>gras</b>" },
    ]);
  });
});

describe("safeLegalHref", () => {
  it("accepts web, mail, phone and same-site targets only", () => {
    expect(safeLegalHref("https://a.fr")).toBe("https://a.fr");
    expect(safeLegalHref("mailto:a@b.fr")).toBe("mailto:a@b.fr");
    expect(safeLegalHref("tel:+33100000000")).toBe("tel:+33100000000");
    expect(safeLegalHref("/fr/legal/cgu")).toBe("/fr/legal/cgu");
    expect(safeLegalHref("#droits")).toBe("#droits");
    expect(safeLegalHref("javascript:alert(1)")).toBeNull();
    expect(safeLegalHref("data:text/html,x")).toBeNull();
    expect(safeLegalHref("//evil.example")).toBeNull();
  });
});

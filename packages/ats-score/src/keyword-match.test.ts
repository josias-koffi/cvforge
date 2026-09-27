import { describe, expect, it } from "vitest";

import {
  KEYWORD_MATCH_LIST_LIMIT,
  matchOfferKeywords,
  offerTerms,
} from "./keyword-match";

const OFFER = `Développeur TypeScript confirmé. Nous recherchons un profil
maîtrisant TypeScript, React et PostgreSQL. Kubernetes apprécié. TypeScript
au quotidien, React côté front.`;

describe("matchOfferKeywords", () => {
  it("splits the offer's terms into present and missing", () => {
    const result = matchOfferKeywords(
      "Cinq ans de typescript et de React. Déploiement sur Kubernetes.",
      OFFER,
    )!;

    expect(result.matched).toEqual(
      expect.arrayContaining(["typescript", "react", "kubernetes"]),
    );
    expect(result.missing).toContain("postgresql");
    expect(result.matched).not.toContain("postgresql");
  });

  it("ignores accents and case on both sides", () => {
    const result = matchOfferKeywords("DEVELOPPEUR", OFFER)!;

    expect(result.matched).toContain("developpeur");
  });

  /** Recruiting prose says nothing about the candidate. */
  it("never asks for the offer's boilerplate", () => {
    const result = matchOfferKeywords("", OFFER)!;

    expect(result.missing).not.toContain("recherchons");
    expect(result.missing).not.toContain("profil");
    expect(result.missing).not.toContain("quotidien");
  });

  it("drops the verbs a French offer addresses the candidate with", () => {
    const result = matchOfferKeywords(
      "",
      "Vous concevrez des API et maintiendrez nos bases PostgreSQL.",
    )!;

    expect(result.missing).toEqual(
      expect.arrayContaining(["postgresql", "bases"]),
    );
    expect(result.missing).not.toContain("concevrez");
    expect(result.missing).not.toContain("maintiendrez");
  });

  it("puts the terms the offer repeats first", () => {
    const result = matchOfferKeywords("", OFFER)!;

    expect(result.missing[0]).toBe("typescript");
    expect(result.missing[1]).toBe("react");
  });

  it("gives the coverage over every term, with a band", () => {
    const none = matchOfferKeywords("", OFFER)!;
    const all = matchOfferKeywords(OFFER, OFFER)!;

    expect(none).toMatchObject({ band: "low", coverage: 0, matchedCount: 0 });
    expect(all).toMatchObject({ band: "good", coverage: 100, missingCount: 0 });
    expect(none.missingCount).toBe(
      offerTerms([OFFER]).filter((term) => !term.endsWith("ez")).length,
    );
  });

  it("calls a middling coverage fair", () => {
    const result = matchOfferKeywords(
      "typescript react postgresql",
      "typescript react postgresql kubernetes docker terraform",
    )!;

    expect(result).toMatchObject({ band: "fair", coverage: 50 });
  });

  it("caps each list but counts every term", () => {
    const offer = Array.from({ length: 50 }, (_, i) => `terme${i}`).join(" ");
    const result = matchOfferKeywords("", offer)!;

    expect(result.missing).toHaveLength(KEYWORD_MATCH_LIST_LIMIT);
    expect(result.missingCount).toBe(50);
  });

  it("returns null for an offer with no usable term", () => {
    expect(
      matchOfferKeywords("typescript", "Nous recherchons un profil."),
    ).toBeNull();
  });
});

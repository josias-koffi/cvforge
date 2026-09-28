import { describe, expect, it } from "vitest";
import { scoreAts } from "./engine";
import { makeDocument, makeExperience } from "./testing/make-document";
import type { AtsDimensionKey, AtsDocument, AtsOfferContext } from "./types";

/**
 * Exactly five usable terms: the title's words are under the four-character
 * floor, so coverage arithmetic in these tests reads straight off the
 * requirements.
 */
const OFFER: AtsOfferContext = {
  requirements: ["typescript", "postgresql", "docker", "kubernetes", "terraform"],
  responsibilities: [],
  title: "Dev",
};

/**
 * A CV with nothing to fault: every bullet opens on an action verb, carries a
 * figure and is well sized, and all three declared skills are evidenced.
 */
const FLAWLESS = makeDocument({
  experiences: [
    makeExperience({
      bullets: [
        "Réduit le temps de build TypeScript de 40% en parallélisant la chaîne CI.",
        "Optimisé 12 requêtes PostgreSQL critiques, divisant par 3 la latence du rapport.",
        "Standardisé 8 images Docker, réduisant de 60% la taille des conteneurs livrés.",
      ],
    }),
  ],
  skills: ["typescript", "postgresql", "docker"],
});

function dimensionOf(
  key: AtsDimensionKey,
  doc: AtsDocument,
  offer?: AtsOfferContext,
) {
  const found = scoreAts(doc, offer ? { offer } : {}).dimensions.find(
    (item) => item.key === key,
  );

  if (!found) throw new Error(`dimension ${key} missing`);

  return found;
}

function codesOf(doc: AtsDocument, offer?: AtsOfferContext) {
  return scoreAts(doc, offer ? { offer } : {}).findings.map(
    (finding) => finding.code,
  );
}

describe("keywords", () => {
  it("stays unavailable without an offer to compare against", () => {
    const dimension = dimensionOf("keywords", makeDocument());

    expect(dimension.status).toBe("unavailable");
    expect(dimension.unavailableReason).toBe("NO_OFFER");
    expect(dimension.score).toBeNull();
  });

  it("becomes scoreable as soon as an offer is supplied", () => {
    expect(dimensionOf("keywords", makeDocument(), OFFER).status).toBe(
      "scored",
    );
  });

  /**
   * The scale tops out at 60 % coverage: matching every term is a CV written
   * for a parser, not a better CV.
   */
  it("awards full marks at 60 % coverage", () => {
    // Three of the offer's five terms.
    expect(dimensionOf("keywords", FLAWLESS, OFFER).score).toBe(100);
  });

  it("counts the offer title's own words as terms to match", () => {
    const titled: AtsOfferContext = { ...OFFER, title: "Ingénieur plateforme" };

    // Two more terms to cover, none of them present: the score must fall.
    expect(dimensionOf("keywords", FLAWLESS, titled).score).toBeLessThan(
      dimensionOf("keywords", FLAWLESS, OFFER).score ?? 0,
    );
  });

  it("does not reward coverage beyond the cap", () => {
    const doc = makeDocument({
      skills: ["typescript", "postgresql", "docker", "kubernetes", "terraform"],
    });

    expect(dimensionOf("keywords", doc, OFFER).score).toBe(100);
  });

  it("scores partial coverage proportionally", () => {
    const doc = makeDocument({ skills: ["typescript"] });

    const score = dimensionOf("keywords", doc, OFFER).score ?? 0;

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("flags coverage too low to read as relevant", () => {
    const doc = makeDocument({
      experiences: [makeExperience({ bullets: ["Fait des choses."] })],
      rawText: "Rien de pertinent ici.",
      skills: [],
    });

    expect(codesOf(doc, OFFER)).toContain("LOW_KEYWORD_COVERAGE");
  });

  it("flags a term repeated past the point of relevance", () => {
    const doc = makeDocument({
      rawText: "docker docker docker docker docker docker docker docker",
      skills: ["typescript", "postgresql", "docker"],
    });

    expect(codesOf(doc, OFFER)).toContain("KEYWORD_STUFFING");
  });

  it("does not flag stuffing on a CV that names a term a few times", () => {
    const doc = makeDocument({ skills: ["typescript", "postgresql", "docker"] });

    expect(codesOf(doc, OFFER)).not.toContain("KEYWORD_STUFFING");
  });

  /** An offer whose every word is too short to carry signal judges nothing. */
  it("falls back to unavailable when the offer yields no usable term", () => {
    const empty: AtsOfferContext = {
      requirements: ["SQL", "Go"],
      responsibilities: [],
      title: "Dev",
    };

    expect(dimensionOf("keywords", makeDocument(), empty).status).toBe(
      "unavailable",
    );
  });

  it("drops the offer's 'vous …ez' verbs from the sentence fallback", () => {
    const addressed: AtsOfferContext = {
      ...OFFER,
      requirements: [...OFFER.requirements, "vous piloterez", "vous animerez"],
    };

    expect(dimensionOf("keywords", FLAWLESS, addressed).score).toBe(
      dimensionOf("keywords", FLAWLESS, OFFER).score,
    );
  });

  it("lists no missing terms when it fell back to the offer's sentences", () => {
    expect(dimensionOf("keywords", FLAWLESS, OFFER).missingTerms).toBeUndefined();
  });
});

describe("keywords (offer keywords)", () => {
  const withKeywords = (keywords: string[]): AtsOfferContext => ({
    ...OFFER,
    keywords,
  });

  it("matches a plural keyword against its singular in the CV", () => {
    const doc = makeDocument({ rawText: "Suivi des KPI.", skills: [] });

    expect(dimensionOf("keywords", doc, withKeywords(["KPIs"])).score).toBe(100);
  });

  it("requires every significant word of a keyword phrase", () => {
    const doc = makeDocument({ rawText: "Montage de stands.", skills: [] });
    const dimension = dimensionOf("keywords", doc, withKeywords(["montage vidéo"]));

    expect(dimension.score).toBe(0);
    expect(dimension.missingTerms).toEqual(["montage vidéo"]);
  });

  it("matches a short acronym keyword as a whole word", () => {
    const doc = makeDocument({ rawText: "Relations presse et RP.", skills: [] });

    expect(dimensionOf("keywords", doc, withKeywords(["RP"])).score).toBe(100);
  });

  it("ignores the sentences once the offer has keywords", () => {
    const doc = makeDocument({ rawText: "TypeScript.", skills: [] });

    // The requirements would score 1/5; the keywords alone decide.
    expect(dimensionOf("keywords", doc, withKeywords(["TypeScript"])).score).toBe(100);
  });

  /**
   * The case that prompted keyword extraction: a CV aligned on what the
   * candidate has done scored 20/100, because the offer's sentences were split
   * into verbs and fillers no CV contains. It must now clear the low-coverage
   * threshold while still naming what the CV genuinely lacks.
   */
  it("scores an aligned internal-communication CV fairly and names its real gaps", () => {
    const doc = makeDocument({
      rawText: [
        "Chargée de Communication Interne.",
        "Experte en stratégie de contenu et communication interne.",
        "Pilotage de la communication interne et externe du groupe.",
        "Animation au Salon International de l'Agriculture avec reporting KPIs.",
        "Trade Marketing, Canva, Photoshop, Esprit d'équipe.",
      ].join(" "),
      skills: ["Communication interne", "Canva", "Photoshop", "KPI & Reporting"],
    });
    const offer = withKeywords([
      "communication interne",
      "stratégie de communication",
      "articles",
      "newsletters",
      "vidéo",
      "montage vidéo",
      "canaux de diffusion",
      "KPIs",
      "Canva",
      "Photoshop",
      "suite Adobe",
      "orthographe",
      "esprit d'équipe",
      "marketing",
    ]);

    const dimension = dimensionOf("keywords", doc, offer);

    expect(dimension.score).toBeGreaterThanOrEqual(80);
    expect(codesOf(doc, offer)).not.toContain("LOW_KEYWORD_COVERAGE");
    expect(dimension.missingTerms).toEqual(
      expect.arrayContaining(["newsletters", "montage vidéo", "suite Adobe"]),
    );
  });

  it("still flags a CV unrelated to the offer's keywords", () => {
    const doc = makeDocument({
      experiences: [makeExperience({ bullets: ["Développement backend."] })],
      rawText: "Développeur Java.",
      skills: ["Java"],
    });

    expect(
      codesOf(doc, withKeywords(["communication interne", "newsletters", "Canva"])),
    ).toContain("LOW_KEYWORD_COVERAGE");
  });
});

describe("impact (rules)", () => {
  it("scores a CV whose bullets do everything right at 100", () => {
    expect(dimensionOf("impact", makeDocument()).score).toBe(100);
  });

  it("drops when bullets do not open on an action verb", () => {
    const doc = makeDocument({
      experiences: [
        makeExperience({
          bullets: [
            "Responsable du build TypeScript et de 40% de la chaîne CI interne.",
            "En charge de 12 requêtes PostgreSQL critiques du rapport mensuel.",
          ],
        }),
      ],
    });

    expect(dimensionOf("impact", doc).score).toBeLessThan(100);
    expect(codesOf(doc)).toContain("MISSING_ACTION_VERBS");
  });

  it("flags bullets that state a task without a result", () => {
    const doc = makeDocument({
      experiences: [
        makeExperience({
          bullets: [
            "Développé la chaîne TypeScript interne de bout en bout pour les équipes.",
            "Optimisé les requêtes PostgreSQL du rapport mensuel avec les analystes.",
          ],
        }),
      ],
    });

    expect(codesOf(doc)).toContain("MISSING_QUANTIFICATION");
  });

  it("flags skills that no experience backs up", () => {
    const doc = makeDocument({
      skills: ["cobol", "fortran", "assembleur"],
    });

    expect(codesOf(doc)).toContain("UNSUPPORTED_SKILLS");
  });

  it("does not flag skills the bullets actually evidence", () => {
    expect(codesOf(makeDocument())).not.toContain("UNSUPPORTED_SKILLS");
  });

  it("bottoms out, rather than scoring well, when there are no bullets at all", () => {
    const doc = makeDocument({
      experiences: [makeExperience({ bullets: [] })],
    });

    expect(dimensionOf("impact", doc).score).toBe(0);
  });

  it("penalises bullets too short to carry a result", () => {
    const doc = makeDocument({
      experiences: [
        makeExperience({
          bullets: ["Réduit 40% TypeScript.", "Optimisé 12 PostgreSQL."],
        }),
      ],
    });

    expect(dimensionOf("impact", doc).score).toBeLessThan(100);
  });
});

describe("renormalisation with an offer", () => {
  /**
   * The same document must not be judged more harshly simply because a
   * dimension became observable.
   */
  it("scores five dimensions with an offer and four without", () => {
    const scoredWithout = scoreAts(FLAWLESS).dimensions.filter(
      (item) => item.status === "scored",
    );
    const scoredWith = scoreAts(FLAWLESS, { offer: OFFER }).dimensions.filter(
      (item) => item.status === "scored",
    );

    expect(scoredWithout).toHaveLength(4);
    expect(scoredWith).toHaveLength(5);
  });

  it("keeps a perfect CV at 100 whether or not an offer is supplied", () => {
    expect(scoreAts(FLAWLESS).overallScore).toBe(100);
    expect(scoreAts(FLAWLESS, { offer: OFFER }).overallScore).toBe(100);
  });
});

import { describe, expect, it } from "vitest";
import {
  countsOf,
  normalizeForSearch,
  retiredCodes,
  romeAttribution,
  shrinkageProblem,
  toReferential,
  type RawMetier,
} from "./rome-referential";

const VERSIONS = { competences: "61", fichesMetiers: "61", metiers: "61" };

const DEV: RawMetier = {
  appellations: [
    {
      code: "38976",
      libelle: "Développeur / Développeuse full-stack",
      libelleCourt: "Développeur full-stack",
    },
    { code: "200151", libelle: "Développeur / Développeuse back-end" },
  ],
  code: "M1855",
  domaineProfessionnel: {
    code: "M18",
    grandDomaine: { code: "M", libelle: "Support à l'entreprise" },
    libelle: "Systèmes d'information et de télécommunication",
  },
  libelle: "Développeur / Développeuse web",
};

describe("toReferential", () => {
  it("maps the three bulk lists into rows", () => {
    const { referential, dropped } = toReferential(
      {
        competences: [
          {
            code: "109846",
            libelle: "Concevoir une application web",
            type: "COMPETENCE-DETAILLEE",
          },
          {
            code: "102732",
            libelle: "Langages de programmation",
            type: "SAVOIR",
          },
        ],
        fiches: [
          {
            code: "M1855",
            groupesCompetencesMobilisees: [
              { competences: [{ code: "109846" }] },
            ],
            groupesSavoirs: [{ savoirs: [{ code: "102732" }] }],
          },
        ],
        metiers: [DEV],
      },
      VERSIONS,
    );

    expect(referential.metiers).toEqual([
      {
        code: "M1855",
        domaineCode: "M18",
        domaineLibelle: "Systèmes d'information et de télécommunication",
        grandDomaineCode: "M",
        grandDomaineLibelle: "Support à l'entreprise",
        libelle: "Développeur / Développeuse web",
      },
    ]);
    expect(referential.appellations).toEqual([
      {
        code: "38976",
        libelle: "Développeur / Développeuse full-stack",
        libelleCourt: "Développeur full-stack",
        libelleSearch: "developpeur / developpeuse full-stack",
        metierCode: "M1855",
      },
      {
        code: "200151",
        libelle: "Développeur / Développeuse back-end",
        // No short label: the full one stands in.
        libelleCourt: "Développeur / Développeuse back-end",
        libelleSearch: "developpeur / developpeuse back-end",
        metierCode: "M1855",
      },
    ]);
    expect(referential.links).toEqual([
      { competenceCode: "109846", metierCode: "M1855" },
      { competenceCode: "102732", metierCode: "M1855" },
    ]);
    expect(referential.versions).toBe(VERSIONS);
    expect(dropped).toEqual({
      appellations: 0,
      competences: 0,
      links: 0,
      metiers: 0,
    });
  });

  it("drops incomplete rows and what points at them, and counts it", () => {
    const { referential, dropped } = toReferential(
      {
        competences: [
          { code: "1", libelle: "Soudage", type: "SAVOIR" },
          { code: "2", libelle: "Sans type" },
          { code: "1", libelle: "Soudage (doublon)", type: "SAVOIR" },
        ],
        fiches: [
          {
            code: "M1855",
            groupesSavoirs: [
              { savoirs: [{ code: "1" }, { code: "1" }, { code: "2" }, {}] },
            ],
          },
          { groupesSavoirs: [{ savoirs: [{ code: "1" }] }] },
          { code: "X9999", groupesSavoirs: [{ savoirs: [{ code: "1" }] }] },
        ],
        metiers: [
          DEV,
          {
            appellations: [{ code: "1", libelle: "Orpheline" }],
            code: "Z0000",
            libelle: "Sans domaine",
          },
          { appellations: [{ code: "2" }], ...{ code: undefined } },
        ],
      },
      VERSIONS,
    );

    expect(referential.metiers.map((metier) => metier.code)).toEqual(["M1855"]);
    expect(referential.competences).toEqual([
      { code: "1", libelle: "Soudage", type: "SAVOIR" },
    ]);
    // The orphan appellation would break the foreign key to its missing métier.
    expect(
      referential.appellations.map((appellation) => appellation.code),
    ).toEqual(["38976", "200151"]);
    expect(referential.links).toEqual([
      { competenceCode: "1", metierCode: "M1855" },
    ]);
    expect(dropped).toEqual({
      appellations: 2,
      competences: 2,
      links: 3,
      metiers: 2,
    });
  });

  it("copes with a métier without appellations or a fiche without groups", () => {
    const { referential } = toReferential(
      {
        competences: [],
        fiches: [{ code: "M1855" }],
        metiers: [{ ...DEV, appellations: undefined }],
      },
      VERSIONS,
    );

    expect(referential.appellations).toEqual([]);
    expect(referential.links).toEqual([]);
  });

  it("keeps empty domain labels rather than dropping the métier", () => {
    const { referential } = toReferential(
      {
        competences: [],
        fiches: [],
        metiers: [
          {
            code: "A1",
            domaineProfessionnel: { code: "A11", grandDomaine: { code: "A" } },
            libelle: "x",
          },
        ],
      },
      VERSIONS,
    );

    expect(referential.metiers[0]).toMatchObject({
      domaineLibelle: "",
      grandDomaineLibelle: "",
    });
  });
});

describe("normalizeForSearch", () => {
  it("removes accents, ligatures, case and extra spaces", () => {
    expect(normalizeForSearch("  Œnologue   Chef de Cuisine  ")).toBe(
      "oenologue chef de cuisine",
    );
    expect(normalizeForSearch("Ingénieur·e d'études")).toBe(
      // The middle dot is a diacritic for Unicode: inclusive spellings match plain ones.
      "ingenieure d'etudes",
    );
    expect(normalizeForSearch("ÆSTHÉTICIEN")).toBe("aestheticien");
  });
});

describe("romeAttribution", () => {
  it("names France Travail and the version when known", () => {
    expect(romeAttribution(VERSIONS)).toBe(
      "Source : ROME 4.0, France Travail (version 61)",
    );
    expect(
      romeAttribution({
        competences: "60",
        fichesMetiers: null,
        metiers: null,
      }),
    ).toContain("(version 60)");
    expect(romeAttribution(null)).toBe("Source : ROME 4.0, France Travail");
  });
});

describe("shrinkageProblem", () => {
  const today = {
    appellations: 14301,
    competences: 35595,
    links: 106792,
    metiers: 1911,
  };

  it("accepts a first copy and a normal update", () => {
    expect(
      shrinkageProblem(
        { appellations: 0, competences: 0, links: 0, metiers: 0 },
        today,
      ),
    ).toBeNull();
    expect(shrinkageProblem(today, { ...today, metiers: 1900 })).toBeNull();
  });

  it("refuses an empty list or a referential that lost more than a tenth", () => {
    expect(shrinkageProblem(today, { ...today, links: 0 })).toBe(
      "links: the download is empty",
    );
    expect(shrinkageProblem(today, { ...today, appellations: 9000 })).toBe(
      "appellations: 9000 against 14301 today",
    );
  });
});

describe("retiredCodes and countsOf", () => {
  it("lists the codes that disappeared, sorted", () => {
    expect(
      retiredCodes(new Set(["B", "A", "C"]), [{ code: "C" }, { code: "D" }]),
    ).toEqual(["A", "B"]);
  });

  it("counts every table", () => {
    const { referential } = toReferential(
      { competences: [], fiches: [], metiers: [DEV] },
      VERSIONS,
    );

    expect(countsOf(referential)).toEqual({
      appellations: 2,
      competences: 0,
      links: 0,
      metiers: 1,
    });
  });
});

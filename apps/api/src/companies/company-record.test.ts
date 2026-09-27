import { describe, expect, it } from "vitest";
import {
  companyBadges,
  nafSectionOf,
  readCompanyRecord,
  readEgaproScore,
  toCompanyProfile,
  type AnnuaireResult,
  type StoredCompany,
} from "./company-record";

/** Trimmed from the live answer of 2026-09-24 for SIREN 381983568. */
const EVERIENCE: AnnuaireResult = {
  activite_principale: "62.03Z",
  categorie_entreprise: "GE",
  complements: {
    bilan_ges_renseigne: true,
    egapro_renseignee: true,
    est_ess: false,
    est_siae: false,
    est_societe_mission: false,
  },
  date_creation: "1991-04-02",
  etat_administratif: "A",
  finances: {
    "2024": { ca: 200_000_000, resultat_net: 1 },
    "2025": { ca: 211_086_627, resultat_net: 20_941_726 },
  },
  nom_complet: "EVERIENCE (EVERIENCE)",
  nom_raison_sociale: "EVERIENCE",
  nombre_etablissements_ouverts: 6,
  siren: "381983568",
  tranche_effectif_salarie: "51",
};

function stored(overrides: Partial<StoredCompany> = {}): StoredCompany {
  const { egaproDeclared: _declared, ...record } = readCompanyRecord(
    "381983568",
    [EVERIENCE],
  )!;

  return {
    ...record,
    employerPageEdited: false,
    employerPageOffers: null,
    employerPagePath: null,
    employerPageReadAt: null,
    found: true,
    logoReadAt: null,
    logoUrl: null,
    refreshedAt: new Date("2026-09-24T10:00:00.000Z"),
    siren: "381983568",
    ...overrides,
  };
}

describe("readCompanyRecord", () => {
  it("keeps the public record and the latest accounts", () => {
    expect(readCompanyRecord("381983568", [EVERIENCE])).toEqual({
      category: "GE",
      closed: false,
      createdOn: "1991-04-02",
      egaproDeclared: true,
      egaproScore: null,
      egaproYear: null,
      ess: false,
      financesYear: "2025",
      gesReport: true,
      headcountBand: "51",
      inclusive: false,
      legalName: "EVERIENCE",
      mission: false,
      nafCode: "62.03Z",
      netIncome: 20_941_726,
      openEstablishments: 6,
      publishable: true,
      revenue: 211_086_627,
    });
  });

  it("reads another company's answer, or none, as unknown", () => {
    expect(readCompanyRecord("000000000", [EVERIENCE])).toBeNull();
    expect(readCompanyRecord("381983568", [])).toBeNull();
    expect(readCompanyRecord("381983568", undefined)).toBeNull();
  });

  it("tolerates a sparse answer", () => {
    expect(
      readCompanyRecord("123456789", [
        { categorie_entreprise: "XX", etat_administratif: "C", siren: "123456789" },
      ]),
    ).toMatchObject({
      category: "",
      closed: true,
      egaproDeclared: false,
      financesYear: null,
      legalName: "",
      revenue: null,
    });
  });
});

describe("publishable (US-140)", () => {
  it("keeps a sole trader, a withheld unit and a blank record off public pages", () => {
    const publishable = (overrides: Partial<AnnuaireResult>) =>
      readCompanyRecord("381983568", [{ ...EVERIENCE, ...overrides }])?.publishable;

    expect(publishable({})).toBe(true);
    expect(
      publishable({ complements: { est_entrepreneur_individuel: true } }),
    ).toBe(false);
    expect(publishable({ statut_diffusion: "P" })).toBe(false);
    expect(publishable({ nom_complet: null, nom_raison_sociale: null })).toBe(false);
  });
});

describe("nafSectionOf", () => {
  it("finds the section of a NAF code from its division", () => {
    expect(nafSectionOf("01.11Z")).toBe("A");
    expect(nafSectionOf("33.20A")).toBe("C");
    expect(nafSectionOf("62.02A")).toBe("J");
    expect(nafSectionOf("63.99Z")).toBe("J");
    expect(nafSectionOf("64.19Z")).toBe("K");
    expect(nafSectionOf("99.00Z")).toBe("U");
  });

  it("answers nothing for a code it cannot read", () => {
    expect(nafSectionOf("")).toBe("");
    expect(nafSectionOf("00.00Z")).toBe("");
    expect(nafSectionOf("6202A")).toBe("");
  });
});

describe("readEgaproScore", () => {
  it("takes the latest year that has a score", () => {
    expect(
      readEgaproScore("381983568", [
        { entreprise: { siren: "999999999" }, notes: { "2025": 10 } },
        { entreprise: { siren: "381983568" }, notes: { "2023": 89, "2024": 95, "2025": null } },
      ]),
    ).toEqual({ score: 95, year: "2024" });
    expect(readEgaproScore("381983568", [])).toBeNull();
  });
});

describe("badges and profile", () => {
  it("names each commitment, the equality index with its score", () => {
    expect(
      companyBadges(stored({ egaproScore: 94, egaproYear: "2025", ess: true, inclusive: true, mission: true })),
    ).toEqual([
      { key: "mission", label: "Société à mission" },
      { key: "ess", label: "Économie sociale et solidaire" },
      { key: "inclusive", label: "Entreprise inclusive" },
      { key: "egapro", label: "Index égalité F/H : 94/100 (2025)" },
      { key: "ges", label: "Bilan carbone publié" },
    ]);
  });

  it("shows nothing of an unknown SIREN", () => {
    expect(companyBadges(stored({ found: false, gesReport: true }))).toEqual([]);
    expect(toCompanyProfile(stored({ found: false }))).toBeNull();
  });

  it("links the France Travail employer page when there is one (US-116)", () => {
    expect(
      toCompanyProfile(
        stored({ employerPageEdited: true, employerPageOffers: 8, employerPagePath: "helpline-913" }),
      )?.employerPage,
    ).toEqual({
      edited: true,
      offers: 8,
      url: "https://recrute.francetravail.fr/page-employeur/helpline-913",
    });
    expect(toCompanyProfile(stored())?.employerPage).toBeNull();
  });

  it("labels INSEE's headcount band", () => {
    expect(toCompanyProfile(stored())?.headcountLabel).toBe("2 000 à 4 999 salariés");
  });
});

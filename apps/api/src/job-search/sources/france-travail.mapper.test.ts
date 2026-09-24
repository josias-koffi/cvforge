import { describe, expect, it } from "vitest";
import {
  readContractType,
  readDepartment,
  readPartnerUrls,
  readRome,
  toNormalizedListing,
  type FranceTravailOffer,
} from "./france-travail.mapper";

/** Shaped like a real payload, trimmed to the fields the mapper reads. */
const OFFER: FranceTravailOffer = {
  alternance: false,
  contact: { urlPostulation: "https://boards.greenhouse.io/acme/jobs/42" },
  dateActualisation: "2026-09-20T08:00:00.000Z",
  dateCreation: "2026-09-01T08:00:00.000Z",
  description: "Vous rejoindrez l'équipe produit. Télétravail partiel possible.",
  entreprise: { nom: "ACME" },
  id: "184XYZQ",
  intitule: "Développeur Full Stack (H/F)",
  lieuTravail: {
    codePostal: "44000",
    commune: "44109",
    latitude: 47.21,
    libelle: "44 - NANTES",
    longitude: -1.55,
  },
  origineOffre: {
    partenaires: [{ nom: "Indeed", url: "https://fr.indeed.com/viewjob?jk=1" }],
    urlOrigine: "https://boards.greenhouse.io/acme/jobs/42",
  },
  salaire: { libelle: "Annuel de 45000,00 Euros à 55000,00 Euros sur 12 mois" },
  typeContrat: "CDI",
};

describe("toNormalizedListing", () => {
  it("maps an offer", () => {
    const listing = toNormalizedListing(OFFER);

    expect(listing).toMatchObject({
      companyAnonymous: false,
      companyName: "ACME",
      contractType: "cdi",
      department: "44",
      externalId: "184XYZQ",
      latitude: 47.21,
      remote: true,
      source: "france_travail",
      title: "Développeur Full Stack (H/F)",
    });
    // The creation date, not dateActualisation: a repost must not look new.
    expect(listing?.publishedAt).toBe("2026-09-01T08:00:00.000Z");
    expect(listing?.url).toContain("184XYZQ");
    expect(listing?.applyUrl).toBe("https://boards.greenhouse.io/acme/jobs/42");
  });

  it("refuses an offer without an id or a title", () => {
    expect(toNormalizedListing({ intitule: "Sans id" })).toBeNull();
    expect(toNormalizedListing({ id: "1" })).toBeNull();
  });

  it("marks a hidden employer as anonymous rather than naming them", () => {
    const listing = toNormalizedListing({
      ...OFFER,
      entreprise: { nom: "Entreprise confidentielle" },
    });

    expect(listing?.companyAnonymous).toBe(true);
    expect(listing?.companyName).toBe("");
  });

  it("keeps the employer's logo, never an anonymous one's (ADR-025)", () => {
    const logo =
      "https://api.francetravail.fr/exp-rechercheoffre/v1/logo-entreprise/MV3d7KZ8";

    expect(
      toNormalizedListing({ ...OFFER, entreprise: { logo, nom: "LIDL" } })?.companyLogoUrl,
    ).toBe(logo);
    expect(toNormalizedListing(OFFER)?.companyLogoUrl).toBe("");
    expect(
      toNormalizedListing({
        ...OFFER,
        entreprise: { logo, nom: "Entreprise confidentielle" },
      })?.companyLogoUrl,
    ).toBe("");
  });

  it("reads no remote when nothing mentions it", () => {
    const listing = toNormalizedListing({
      ...OFFER,
      description: "Poste sur site, équipe de 12 personnes.",
      intitule: "Développeur",
    });

    expect(listing?.remote).toBe(false);
  });
});

describe("readContractType", () => {
  it("reads an alternance from the nature, not the type", () => {
    // Typed CDD, but it is an apprenticeship: offering it as a CDD would send
    // it to candidates who never asked for an alternance.
    expect(readContractType({ natureContrat: "E2", typeContrat: "CDD" })).toBe(
      "alternance",
    );
    expect(readContractType({ alternance: true, typeContrat: "CDI" })).toBe(
      "alternance",
    );
  });

  it.each([
    ["CDI", "cdi"],
    ["CDD", "cdd"],
    ["MIS", "interim"],
    ["LIB", "freelance"],
  ])("reads %s as %s", (code, expected) => {
    expect(readContractType({ typeContrat: code })).toBe(expected);
  });

  it("reads an unknown code as unknown rather than guessing a CDI", () => {
    expect(readContractType({ typeContrat: "ZZZ" })).toBe("unknown");
    expect(readContractType({})).toBe("unknown");
  });
});

describe("readDepartment", () => {
  it.each([
    ["44 - NANTES", "44"],
    ["2A - AJACCIO", "2A"],
    ["974 - SAINT-DENIS", "974"],
  ])("reads %j as %j", (libelle, expected) => {
    expect(readDepartment({ lieuTravail: { libelle } })).toBe(expected);
  });

  it("falls back on the postcode", () => {
    expect(
      readDepartment({ lieuTravail: { codePostal: "75015", libelle: "Paris" } }),
    ).toBe("75");
    expect(
      readDepartment({ lieuTravail: { codePostal: "97400", libelle: "" } }),
    ).toBe("974");
  });

  it("returns nothing rather than a wrong department", () => {
    expect(readDepartment({ lieuTravail: { libelle: "France entière" } })).toBe("");
    expect(readDepartment({})).toBe("");
  });
});

describe("readPartnerUrls", () => {
  it("collects the origin and partner links, deduplicated", () => {
    expect(readPartnerUrls(OFFER)).toEqual([
      "https://boards.greenhouse.io/acme/jobs/42",
      "https://fr.indeed.com/viewjob?jk=1",
    ]);
  });

  it("returns nothing when the offer is France Travail's own", () => {
    expect(readPartnerUrls({ ...OFFER, origineOffre: {} })).toEqual([]);
  });
});

describe("readRome (US-124)", () => {
  it("keeps the ROME code, the appellation's label and the skills", () => {
    expect(
      readRome({
        ...OFFER,
        appellationlibelle: "Développeur / Développeuse informatique",
        competences: [
          { code: "109846", exigence: "S", libelle: "Concevoir une application web" },
          { code: "300688", exigence: "E", libelle: "Application web" },
          { code: "", libelle: "Sans code" },
        ],
        romeCode: " m1805 ",
      }),
    ).toEqual({
      rome: {
        appellationLabel: "Développeur / Développeuse informatique",
        code: "M1805",
        competences: [
          { code: "109846", label: "Concevoir une application web", required: false },
          { code: "300688", label: "Application web", required: true },
        ],
      },
    });
  });

  it("adds nothing without a ROME code", () => {
    expect(readRome(OFFER)).toEqual({});
    expect(toNormalizedListing(OFFER)?.rome).toBeUndefined();
  });

  it("carries the ROME job into the listing", () => {
    expect(toNormalizedListing({ ...OFFER, romeCode: "M1855" })?.rome).toEqual({
      appellationLabel: "",
      code: "M1855",
      competences: [],
    });
  });
});


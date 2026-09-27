import { describe, expect, it } from "vitest";
import {
  departmentFromAddress,
  toNormalizedListing,
  type LaBonneAlternanceOffer,
} from "./la-bonne-alternance.mapper";

/**
 * Shaped after the live OpenAPI description read on 2026-09-23
 * (`/api/documentation/json`), field by field — not a captured response: the
 * API refuses every call without a key, and we have none yet.
 */
function makeOffer(
  overrides: Partial<LaBonneAlternanceOffer> = {},
): LaBonneAlternanceOffer {
  return {
    apply: { url: "https://labonnealternance.apprentissage.beta.gouv.fr/offre/1" },
    contract: { remote: "onsite", type: ["Apprentissage"] },
    identifier: { id: "lba-1", partner_job_id: "1", partner_label: "LBA" },
    offer: {
      description: "Vous assisterez l'équipe comptable.",
      publication: { creation: "2026-09-20T08:00:00.000Z", expiration: null },
      rome_codes: ["M1203"],
      status: "Active",
      title: "Alternant comptable",
    },
    workplace: {
      brand: "ACME",
      legal_name: "ACME SAS",
      location: {
        address: "12 rue de la Paix, 44000 Nantes",
        geopoint: { coordinates: [-1.5536, 47.2184], type: "Point" },
      },
      name: "ACME Nantes",
      website: "https://acme.fr",
    },
    ...overrides,
  };
}

describe("toNormalizedListing", () => {
  it("maps an offer to our own shape", () => {
    expect(toNormalizedListing(makeOffer())).toMatchObject({
      applyUrl:
        "https://labonnealternance.apprentissage.beta.gouv.fr/offre/1",
      companyAnonymous: false,
      companyName: "ACME",
      contractType: "alternance",
      department: "44",
      externalId: "lba-1",
      partnerUrls: ["https://acme.fr"],
      publishedAt: "2026-09-20T08:00:00.000Z",
      remote: false,
      // The API publishes no pay; saying "selon profil" would be inventing it.
      salaryLabel: "",
      source: "la_bonne_alternance",
      title: "Alternant comptable",
    });
  });

  it("reads the coordinates as GeoJSON, longitude first", () => {
    // The schema's own examples have the two swapped; its field descriptions
    // and the GeoJSON convention agree, so they win.
    const listing = toNormalizedListing(makeOffer());

    expect(listing?.longitude).toBe(-1.5536);
    expect(listing?.latitude).toBe(47.2184);
  });

  it("marks a relayed offer so nobody asks the API about it", () => {
    const listing = toNormalizedListing(
      makeOffer({
        identifier: {
          id: null,
          partner_job_id: "ft-987",
          partner_label: "France Travail",
        },
      }),
    );

    expect(listing?.externalId).toBe("partner:France Travail:ft-987");
  });

  it("drops an offer that is no longer open", () => {
    for (const status of ["Filled", "Cancelled"]) {
      expect(
        toNormalizedListing(makeOffer({ offer: { ...makeOffer().offer, status } })),
      ).toBeNull();
    }
  });

  it("drops an offer with nothing to click on", () => {
    expect(toNormalizedListing(makeOffer({ apply: { url: null } }))).toBeNull();
  });

  it("hides the employer when the payload names none", () => {
    expect(
      toNormalizedListing(
        makeOffer({
          workplace: {
            ...makeOffer().workplace,
            brand: null,
            legal_name: null,
            name: null,
          },
        }),
      ),
    ).toMatchObject({ companyAnonymous: true, companyName: "" });
  });

  it("counts hybrid work as remote, on site as not", () => {
    expect(
      toNormalizedListing(makeOffer({ contract: { remote: "hybrid" } }))?.remote,
    ).toBe(true);
    expect(
      toNormalizedListing(makeOffer({ contract: { remote: null } }))?.remote,
    ).toBe(false);
  });

  it("survives an empty payload", () => {
    expect(toNormalizedListing({})).toBeNull();
  });
});

describe("departmentFromAddress", () => {
  it("reads the postcode at the end, not a street number", () => {
    expect(departmentFromAddress("12345 rue Longue, 69003 Lyon")).toBe("69")
  });

  it("keeps three digits overseas", () => {
    expect(departmentFromAddress("Avenue X, 97400 Saint-Denis")).toBe("974")
  });

  it("says nothing rather than guessing", () => {
    expect(departmentFromAddress("Quelque part en France")).toBe("")
  });
});

describe("ROME job (US-124)", () => {
  it("keeps the first ROME code of the offer", () => {
    expect(toNormalizedListing(makeOffer())?.rome).toEqual({
      appellationLabel: "",
      code: "M1203",
      competences: [],
    });
  });

  it("adds nothing when the offer names no ROME code", () => {
    expect(
      toNormalizedListing(
        makeOffer({ offer: { ...makeOffer().offer, rome_codes: [] } }),
      )?.rome,
    ).toBeUndefined();
  });
});


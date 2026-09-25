import { describe, expect, it } from "vitest";
import { readJobDetails } from "./listing-details";

const OPEN = null;

describe("readJobDetails", () => {
  it("reads the best open advert and completes it with the others", () => {
    const details = readJobDetails([
      {
        applyUrl: "",
        closedAt: OPEN,
        companyAnonymous: false,
        raw: { typeContratLibelle: "CDI" },
        source: "france_travail",
        url: "",
      },
      {
        applyUrl: "https://jobs.lever.co/acme/1/apply",
        closedAt: OPEN,
        companyAnonymous: false,
        raw: {},
        source: "lever",
        url: "https://jobs.lever.co/acme/1",
      },
    ]);

    // The company's own board outranks France Travail…
    expect(details?.source).toBe("lever");
    expect(details?.companyWebsite).toBe("https://jobs.lever.co/acme");
    // …which still adds what the board does not say.
    expect(details?.facts).toEqual([{ label: "Contrat", value: "CDI" }]);
  });

  it("fills a missing application link from another advert", () => {
    const details = readJobDetails([
      {
        applyUrl: "",
        closedAt: OPEN,
        companyAnonymous: false,
        raw: {},
        source: "la_bonne_alternance",
        url: "",
      },
      {
        applyUrl: "",
        closedAt: OPEN,
        companyAnonymous: false,
        raw: {},
        source: "france_travail",
        url: "https://candidat.francetravail.fr/offres/recherche/detail/1",
      },
    ]);

    expect(details?.apply?.host).toBe("candidat.francetravail.fr");
  });

  it("has nothing to say about a job whose adverts are all closed", () => {
    expect(
      readJobDetails([
        {
          applyUrl: "",
          closedAt: new Date(),
          companyAnonymous: false,
          raw: {},
          source: "lever",
          url: "https://jobs.lever.co/acme/1",
        },
      ]),
    ).toBeNull();
  });
});

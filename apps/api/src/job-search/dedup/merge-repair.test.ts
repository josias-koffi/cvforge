import { describe, expect, it } from "vitest";
import { listingsToDetach, type RepairListing } from "./merge-repair";

const ADVERT = `Nous recherchons un développeur full stack pour rejoindre notre équipe produit.
Vous travaillerez sur notre application React et notre API Node.js en TypeScript, avec PostgreSQL.`;

function makeListing(overrides: Partial<RepairListing> = {}): RepairListing {
  return {
    companyAnonymous: false,
    companyName: "ACME",
    department: "59",
    description: ADVERT,
    firstSeenAt: "2026-10-01T08:00:00.000Z",
    id: "opener",
    matchMethod: "new",
    publishedAt: "2026-10-01T08:00:00.000Z",
    title: "Développeur Full Stack (H/F)",
    urls: ["https://candidat.francetravail.fr/offres/recherche/detail/1"],
    ...overrides,
  };
}

describe("listingsToDetach", () => {
  it("detaches the adverts a route-less link had merged", () => {
    const opener = makeListing({
      urls: [
        "https://app.beetween.com/WeaselWeb/p/#/apply/job/aaa/developpeur",
      ],
    });
    const chef = makeListing({
      companyName: "Brasserie du Port",
      description:
        "Chef de rang pour notre brasserie, service du midi et du soir.",
      firstSeenAt: "2026-10-02T08:00:00.000Z",
      id: "chef",
      matchMethod: "url",
      title: "Chef de rang (H/F)",
      urls: [
        "https://app.beetween.com/WeaselWeb/p/#/apply/job/bbb/chef-de-rang",
      ],
    });

    expect(listingsToDetach([chef, opener])).toEqual(["chef"]);
  });

  it("detaches an anonymous advert merged from another department", () => {
    const opener = makeListing({ companyAnonymous: true, companyName: "" });
    const elsewhere = makeListing({
      companyAnonymous: true,
      companyName: "",
      department: "21",
      id: "elsewhere",
      matchMethod: "fuzzy",
      title: "Cariste (H/F)",
      urls: [],
    });

    expect(listingsToDetach([opener, elsewhere])).toEqual(["elsewhere"]);
  });

  it("keeps a job published by France Travail, the board and a partner", () => {
    const board = "https://boards.greenhouse.io/acme/jobs/42";
    const opener = makeListing({ urls: [board] });
    const franceTravail = makeListing({
      id: "france-travail",
      matchMethod: "url",
      urls: [
        "https://candidat.francetravail.fr/offres/recherche/detail/9",
        board,
      ],
    });
    // Linked to the France Travail advert only, not to the opener.
    const partner = makeListing({
      id: "partner",
      matchMethod: "url",
      title: "Full-Stack Developer",
      urls: ["https://candidat.francetravail.fr/offres/recherche/detail/9"],
    });

    expect(listingsToDetach([partner, franceTravail, opener])).toEqual([]);
  });

  it("never undoes a merge decided by an admin or on the exact key", () => {
    const other = { department: "13", title: "Comptable (H/F)", urls: [] };

    expect(
      listingsToDetach([
        makeListing(),
        makeListing({ ...other, id: "manual", matchMethod: "manual" }),
        makeListing({ ...other, id: "strict", matchMethod: "strict_key" }),
      ]),
    ).toEqual([]);
  });

  it("leaves a job of one advert alone", () => {
    expect(listingsToDetach([makeListing()])).toEqual([]);
  });
});

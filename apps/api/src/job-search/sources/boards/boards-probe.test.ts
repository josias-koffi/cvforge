import { describe, expect, it, vi } from "vitest";
import type { NormalizedJobListing } from "../../job-search.types";
import type { CompanyBoardAdapter } from "./board.types";
import { BoardNotFoundError } from "./board.types";
import type { BoardProvider } from "./detect-board";
import {
  isThisCompany,
  probeCompanies,
  probeCompany,
  tokenCandidates,
} from "./boards-probe";

function listing(department = "44"): NormalizedJobListing {
  return {
    applyUrl: "https://example.test/apply",
    companyAnonymous: false,
    companyName: "ACME",
    contractType: "cdi",
    department,
    description: "",
    externalId: "1",
    latitude: null,
    locationLabel: "Nantes",
    longitude: null,
    partnerUrls: [],
    publishedAt: null,
    raw: {},
    remote: false,
    salaryLabel: "",
    source: "greenhouse",
    title: "Développeur",
    url: "https://example.test/1",
  };
}

/** A board that answers for one token and 404s for every other. */
function boardFor(
  provider: BoardProvider,
  known: string,
  count = 5,
  abroad = 0,
): CompanyBoardAdapter {
  return {
    fetchBoard: vi.fn(async (boardToken: string) => {
      if (boardToken !== known) throw new BoardNotFoundError(provider, boardToken);

      return [
        ...Array.from({ length: count }, () => listing("44")),
        ...Array.from({ length: abroad }, () => listing("")),
      ];
    }),
    provider,
  };
}

describe("tokenCandidates", () => {
  it("offers the spellings a board address actually uses", () => {
    expect(tokenCandidates("Fnac Darty")).toEqual([
      "fnacdarty",
      "fnac-darty",
      "fnac",
      "FnacDarty",
    ]);
  });

  it("folds accents and apostrophes", () => {
    expect(tokenCandidates("L'Oréal")).toContain("loreal");
  });

  it("drops the legal noise that never appears in an address", () => {
    // "Sodexo Group France" lives at /sodexo, never at /sodexogroupfrance.
    expect(tokenCandidates("Sodexo Group France")[0]).toBe("sodexo");
  });

  it("keeps the name whole when stripping would empty it", () => {
    expect(tokenCandidates("Groupe France")).toContain("groupefrance");
  });

  it("ignores a name too short to be an address", () => {
    expect(tokenCandidates("AB")).toEqual([]);
    expect(tokenCandidates("  ")).toEqual([]);
  });
});

describe("probeCompany", () => {
  it("finds the board behind a name", async () => {
    const adapters = [boardFor("greenhouse", "acme", 12)];

    expect(await probeCompany("ACME", adapters)).toEqual({
      boardToken: "acme",
      companyName: "ACME",
      frenchCount: 12,
      listingCount: 12,
      provider: "greenhouse",
    });
  });

  it("refuses a board that is somebody else abroad", async () => {
    // `ashbyhq.com/vinci` is an AI startup in Palo Alto with two Paris roles,
    // not the construction group. Registering it would file its offers under
    // a name candidates recognise.
    const impostor = boardFor("ashby", "vinci", 2, 25);

    expect(await probeCompany("Vinci", [impostor])).toBeNull();
  });

  it("refuses a board that answers with nothing", async () => {
    // Several large groups keep an address alive with no offer on it;
    // registering those would fill the registry with silence.
    const empty: CompanyBoardAdapter = {
      fetchBoard: async () => [],
      provider: "lever",
    };

    expect(await probeCompany("ACME", [empty])).toBeNull();
  });

  it("stops at the first board that answers", async () => {
    const first = boardFor("greenhouse", "acme");
    const second = boardFor("lever", "acme");

    await probeCompany("ACME", [first, second]);

    expect(second.fetchBoard).not.toHaveBeenCalled();
  });

  it("tries the other spellings of a name", async () => {
    const adapters = [boardFor("ashby", "fnac-darty")];

    expect((await probeCompany("Fnac Darty", adapters))?.boardToken).toBe(
      "fnac-darty",
    );
  });
});

describe("probeCompanies", () => {
  it("registers what answered, and only that", async () => {
    const register = vi.fn(async () => ({}) as never);
    const report = await probeCompanies(
      ["ACME", "Inconnue"],
      [boardFor("greenhouse", "acme", 4)],
      { register },
    );

    expect(report).toMatchObject({ probed: 2, registered: 1 });
    expect(register).toHaveBeenCalledWith({
      boardToken: "acme",
      companyName: "ACME",
      // Not "seed" nor "crawl": the screen says where a row came from, and a
      // guessed address checked live is neither.
      origin: "probe",
      provider: "greenhouse",
    });
  });

  it("probes a repeated employer once", async () => {
    const board = boardFor("greenhouse", "acme");
    const report = await probeCompanies(["ACME", "acme", " ACME "], [board], null);

    expect(report.probed).toBe(1);
  });

  it("reports without registering when asked not to", async () => {
    const report = await probeCompanies(
      ["ACME"],
      [boardFor("greenhouse", "acme")],
      null,
    );

    expect(report.hits).toHaveLength(1);
    expect(report.registered).toBe(0);
  });
});

describe("isThisCompany", () => {
  it("separates the boards measured on 2026-09-23", () => {
    // Genuine: Accor 49/60, Eurofins 46/60, Doctolib 81/83.
    expect(isThisCompany(60, 49)).toBe(true);
    expect(isThisCompany(83, 81)).toBe(true);
    // Impostors: greenhouse/air 0/9, ashby/bureau 0/1, ashby/vinci 2/27.
    expect(isThisCompany(9, 0)).toBe(false);
    expect(isThisCompany(1, 0)).toBe(false);
    expect(isThisCompany(27, 2)).toBe(false);
  });

  it("refuses a tiny board even when all of it is French", () => {
    // Three offers is the floor: one French advert proves nothing.
    expect(isThisCompany(2, 2)).toBe(false);
    expect(isThisCompany(3, 3)).toBe(true);
  });
});

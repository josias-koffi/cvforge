import { describe, expect, it, vi } from "vitest";
import type {
  AnnuaireResult,
  StoredCompany,
} from "../companies/company-record";
import { CompanySources } from "../companies/company-sources";
import { SourceRateLimiter } from "../shared/rate-limit/source-rate-limiter";
import { CompanyCheckService } from "./company-check.service";

const SIREN = "381983568";

/** Trimmed from the live answer of 2026-09-24. */
const HELPLINE: AnnuaireResult = {
  activite_principale: "82.20Z",
  categorie_entreprise: "GE",
  complements: {
    bilan_ges_renseigne: true,
    egapro_renseignee: true,
    est_ess: false,
    est_societe_mission: true,
  },
  date_creation: "1991-03-01",
  etat_administratif: "A",
  finances: { "2025": { ca: 211_100_000, resultat_net: 3_000_000 } },
  nom_raison_sociale: "HELPLINE",
  nombre_etablissements_ouverts: 14,
  section_activite_principale: "N",
  siege: { code_postal: "92400", libelle_commune: "COURBEVOIE" },
  siren: SIREN,
  statut_diffusion: "O",
  tranche_effectif_salarie: "51",
};

const SOLE_TRADER: AnnuaireResult = {
  complements: { est_entrepreneur_individuel: true },
  nom_complet: "JEAN HELPLINE",
  siren: "912345678",
};

function service({
  results = [HELPLINE] as AnnuaireResult[],
  stored = [] as Partial<StoredCompany>[],
} = {}) {
  const sources = {
    egaproScore: vi.fn().mockResolvedValue({ score: 94, year: "2025" }),
    search: vi.fn().mockResolvedValue(results),
  };
  const store = { findMany: vi.fn().mockResolvedValue(stored) };

  return { service: new CompanyCheckService(sources, store as never), sources };
}

describe("CompanyCheckService.search", () => {
  it("searches by name and keeps companies only", async () => {
    const { service: check, sources } = service({
      results: [HELPLINE, SOLE_TRADER, { ...HELPLINE, siren: "1", statut_diffusion: "O" }],
    });

    await expect(check.search("  helpline   courbevoie ")).resolves.toEqual({
      matches: [
        {
          city: "COURBEVOIE",
          closed: false,
          headcountBand: "51",
          nafCode: "82.20Z",
          name: "HELPLINE",
          postcode: "92400",
          siren: SIREN,
        },
      ],
    });
    expect(sources.search).toHaveBeenCalledWith("helpline courbevoie", 8);
  });

  it("hides a company that asked INSEE to withhold its data", async () => {
    const { service: check } = service({
      results: [{ ...HELPLINE, statut_diffusion: "P" }],
    });

    await expect(check.search("helpline")).resolves.toEqual({ matches: [] });
  });

  it("searches a SIREN or a SIRET as the SIREN, and keeps that one only", async () => {
    const { service: check, sources } = service({
      results: [HELPLINE, { ...HELPLINE, siren: "552100554" }],
    });

    const bySiret = await check.search("381 983 568 00012");
    expect(bySiret.matches.map((match) => match.siren)).toEqual([SIREN]);
    expect(sources.search).toHaveBeenCalledWith(SIREN, 8);
    await check.search("381.983.568");
    expect(sources.search).toHaveBeenLastCalledWith(SIREN, 8);
  });

  it("answers an unknown company with an empty list, not an error", async () => {
    await expect(service({ results: [] }).service.search("zzqx")).resolves.toEqual({
      matches: [],
    });
  });

  it.each([undefined, "", "ab", "x".repeat(101), 42])(
    "refuses %s before asking the Annuaire",
    async (query) => {
      const { service: check, sources } = service();

      await expect(check.search(query)).rejects.toMatchObject({
        response: { code: "COMPANY_QUERY_INVALID" },
        status: 400,
      });
      expect(sources.search).not.toHaveBeenCalled();
    },
  );

  it("answers 503 with a code when the Annuaire fails", async () => {
    const down = new CompanyCheckService(
      { egaproScore: vi.fn(), search: vi.fn().mockResolvedValue(undefined) },
      { findMany: vi.fn() },
    );

    await expect(down.search("helpline")).rejects.toMatchObject({
      response: { code: "COMPANY_SOURCE_UNAVAILABLE" },
      status: 503,
    });
  });
});

describe("CompanyCheckService.read", () => {
  it("builds the record, Egapro and the stored employer page included", async () => {
    const { service: check } = service({
      stored: [
        {
          employerPageEdited: true,
          employerPageOffers: 8,
          employerPagePath: "helpline-913",
          siren: SIREN,
        },
      ],
    });

    await expect(check.read(SIREN)).resolves.toEqual({
      company: {
        category: "GE",
        closed: false,
        createdOn: "1991-03-01",
        egapro: { score: 94, year: "2025" },
        employerPage: {
          edited: true,
          offers: 8,
          url: "https://recrute.francetravail.fr/page-employeur/helpline-913",
        },
        ess: false,
        finances: { netIncome: 3_000_000, revenue: 211_100_000, year: "2025" },
        gesReport: true,
        headcountBand: "51",
        inclusive: false,
        legalName: "HELPLINE",
        mission: true,
        nafCode: "82.20Z",
        nafSection: "N",
        openEstablishments: 14,
        siren: SIREN,
      },
      status: "found",
    });
  });

  it("asks Egapro only for a company that declared its index", async () => {
    const { service: check, sources } = service({
      results: [{ ...HELPLINE, complements: { egapro_renseignee: false } }],
    });

    const answer = await check.read(SIREN);

    expect(answer).toMatchObject({ company: { egapro: null, employerPage: null } });
    expect(sources.egaproScore).not.toHaveBeenCalled();
  });

  it("says unknown for the blank record the Annuaire gives some SIRENs", async () => {
    await expect(
      service({ results: [{ siren: "123456789" }] }).service.read("123456789"),
    ).resolves.toEqual({ status: "unknown" });
  });

  it("says unknown, with a 200, for a SIREN the Annuaire lacks or a sole trader", async () => {
    await expect(service({ results: [] }).service.read(SIREN)).resolves.toEqual({
      status: "unknown",
    });
    await expect(
      service({ results: [SOLE_TRADER] }).service.read("912345678"),
    ).resolves.toEqual({ status: "unknown" });
  });

  it("refuses a malformed SIREN", async () => {
    await expect(service().service.read("38198356")).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe("CompanyCheckService with the real sources", () => {
  /** Keyless, and no France Travail: only the two public hosts are asked. */
  it("asks the Annuaire and Egapro, and nothing else", async () => {
    const hosts: string[] = [];
    const fetchImpl = (async (url: string) => {
      const host = new URL(url).host;
      hosts.push(host);
      const body =
        host === "egapro.travail.gouv.fr"
          ? { data: [{ entreprise: { siren: SIREN }, notes: { "2025": 94 } }] }
          : { results: [HELPLINE] };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;
    const sources = new CompanySources(
      fetchImpl,
      Date.now,
      new SourceRateLimiter({ requestsPerSecond: 1_000, sleep: async () => undefined }),
    );
    const check = new CompanyCheckService(sources, { findMany: async () => [] });

    await check.search("helpline");
    await check.read(SIREN);

    expect(hosts).toEqual([
      "recherche-entreprises.api.gouv.fr",
      "recherche-entreprises.api.gouv.fr",
      "egapro.travail.gouv.fr",
    ]);
  });
});

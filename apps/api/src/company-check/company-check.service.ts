import {
  publicError,
  type CompanyCheckMatch,
  type CompanyCheckSheet,
  type PublicCompanyCheckResponse,
  type PublicCompanyCheckSearch,
} from "@cvforge/types";
import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { CompaniesStore } from "../companies/companies.pg-store";
import {
  companyCategory,
  employerPageOf,
  readCompanyRecord,
  sirenOf,
  type AnnuaireResult,
} from "../companies/company-record";
import type { CompanySources } from "../companies/company-sources";

/** The Annuaire refuses fewer characters; more is not a company name. */
const MIN_QUERY_CHARS = 3;
const MAX_QUERY_CHARS = 100;
const MATCHES_LIMIT = 8;
const SIREN = /^\d{9}$/;
const SIRET = /^\d{14}$/;

export const COMPANY_QUERY_INVALID_MESSAGE =
  "Saisissez un nom d'entreprise (3 caracteres au moins) ou un SIREN.";
export const COMPANY_SOURCE_UNAVAILABLE_MESSAGE =
  "L'Annuaire des entreprises ne repond pas. Reessayez dans un instant.";

type Sources = Pick<CompanySources, "search" | "egaproScore">;

/**
 * The free "check an employer" tool (US-139). Asks the Annuaire des
 * entreprises and Egapro, both public and keyless, at the visitor's request,
 * and stores nothing. The France Travail employer page is only read from the
 * hourly refresh's copy: no France Travail call on the way.
 */
export class CompanyCheckService {
  constructor(
    private readonly sources: Sources,
    private readonly store: Pick<CompaniesStore, "findMany">,
  ) {}

  /** A name, a SIREN or a SIRET; no match is an empty list, not an error. */
  async search(query: unknown): Promise<PublicCompanyCheckSearch> {
    const { siren, text } = readQuery(query);
    const results = await this.ask(siren ?? text, MATCHES_LIMIT);
    const matches = results
      .filter(isPublishable)
      .filter((result) => !siren || result.siren === siren)
      .map(toMatch);

    return { matches };
  }

  async read(value: unknown): Promise<PublicCompanyCheckResponse> {
    const siren = this.acceptSiren(value);
    const result = (await this.ask(siren, 1)).find(
      (entry) => entry.siren === siren && isPublishable(entry),
    );
    const record = result ? readCompanyRecord(siren, [result]) : null;
    if (!result || !record) return { status: "unknown" };

    const [egapro, stored] = await Promise.all([
      record.egaproDeclared ? this.sources.egaproScore(siren) : null,
      this.store.findMany([siren]),
    ]);

    const company: CompanyCheckSheet = {
      category: companyCategory(record.category),
      closed: record.closed,
      createdOn: record.createdOn,
      egapro,
      employerPage: stored[0] ? employerPageOf(stored[0]) : null,
      ess: record.ess,
      finances: record.financesYear
        ? {
            netIncome: record.netIncome,
            revenue: record.revenue,
            year: record.financesYear,
          }
        : null,
      gesReport: record.gesReport,
      headcountBand: record.headcountBand,
      inclusive: record.inclusive,
      legalName: record.legalName,
      mission: record.mission,
      nafCode: record.nafCode,
      nafSection: result.section_activite_principale ?? "",
      openEstablishments: record.openEstablishments,
      siren,
    };

    return { company, status: "found" };
  }

  /** A well-formed SIREN, or a 400; the Annuaire is not asked. */
  acceptSiren(value: unknown): string {
    const siren = typeof value === "string" ? value.trim() : "";
    if (!SIREN.test(siren)) throw invalidQuery();

    return siren;
  }

  private async ask(query: string, limit: number) {
    const results = await this.sources.search(query, limit);
    if (results === undefined) {
      throw new ServiceUnavailableException(
        publicError(
          "COMPANY_SOURCE_UNAVAILABLE",
          COMPANY_SOURCE_UNAVAILABLE_MESSAGE,
        ),
      );
    }

    return results;
  }
}

/** A SIRET is searched as its SIREN: the Annuaire finds neither by SIRET. */
function readQuery(query: unknown): { siren: string | null; text: string } {
  const text =
    typeof query === "string" ? query.trim().replace(/\s+/g, " ") : "";
  const digits = text.replace(/[\s.]/g, "");

  if (SIRET.test(digits)) return { siren: sirenOf(digits), text };
  if (SIREN.test(digits)) return { siren: digits, text };
  if (text.length < MIN_QUERY_CHARS || text.length > MAX_QUERY_CHARS) {
    throw invalidQuery();
  }

  return { siren: null, text };
}

function invalidQuery() {
  return new BadRequestException(
    publicError("COMPANY_QUERY_INVALID", COMPANY_QUERY_INVALID_MESSAGE),
  );
}

/**
 * Only named companies: a sole trader's record names a person, a unit that
 * asked INSEE to withhold its data is not ours to show, and the Annuaire
 * answers some SIRENs with a blank record (123456789 on 2026-09-24).
 */
function isPublishable(result: AnnuaireResult): result is AnnuaireResult & {
  siren: string;
} {
  return (
    typeof result.siren === "string" &&
    SIREN.test(result.siren) &&
    Boolean(result.nom_raison_sociale || result.nom_complet) &&
    result.statut_diffusion !== "P" &&
    result.complements?.est_entrepreneur_individuel !== true
  );
}

function toMatch(result: AnnuaireResult & { siren: string }): CompanyCheckMatch {
  return {
    city: result.siege?.libelle_commune ?? "",
    closed: result.etat_administratif === "C",
    headcountBand: result.tranche_effectif_salarie ?? "",
    nafCode: result.activite_principale ?? "",
    name: result.nom_raison_sociale || result.nom_complet || "",
    postcode: result.siege?.code_postal ?? "",
    siren: result.siren,
  };
}

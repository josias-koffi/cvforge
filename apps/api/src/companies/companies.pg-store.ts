import { eq, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { companies, hiringCompanies } from "../database/schema";
import type { CompanyRecord, StoredCompany } from "./company-record";
import type { EmployerPage } from "./employer-pages.source";

/** DI token for the companies' store. */
export const COMPANIES_STORE = Symbol("COMPANIES_STORE");

/** A company to read, with what Pages employeurs needs to find it. */
export interface DueCompany {
  siren: string;
  /** The name La Bonne Boîte gives one of its establishments. */
  name: string;
  /** The department of that establishment. */
  department: string;
}

export interface CompaniesStore {
  /**
   * Hiring establishments' companies never read, or read before `before`;
   * with `employerPages`, also those whose page was never asked for.
   */
  due(
    before: Date,
    limit: number,
    options?: { employerPages?: boolean },
  ): Promise<DueCompany[]>;
  /**
   * `null` records an unknown SIREN, so it is not asked again at once. An
   * `undefined` page or logo leaves the known one as it was.
   */
  save(
    siren: string,
    record: CompanyRecord | null,
    at: Date,
    page?: EmployerPage | null,
    logo?: string | null,
  ): Promise<void>;
  findMany(sirens: readonly string[]): Promise<StoredCompany[]>;
}

export class PgCompaniesStore implements CompaniesStore {
  constructor(private readonly db: Database) {}

  async due(before: Date, limit: number, options: { employerPages?: boolean } = {}) {
    const siren = sql<string>`left(${hiringCompanies.siret}, 9)`;
    const stale: SQL[] = [
      isNull(companies.siren),
      lt(companies.refreshedAt, before),
      // Companies read before logos existed get theirs without a month's wait.
      isNull(companies.logoReadAt),
      // Likewise for the flag the public pages need (US-140).
      isNull(companies.publishable),
    ];
    if (options.employerPages) stale.push(isNull(companies.employerPageReadAt));

    return this.db
      .select({
        department: sql<string>`min(${hiringCompanies.department})`,
        name: sql<string>`min(${hiringCompanies.name})`,
        siren,
      })
      .from(hiringCompanies)
      .leftJoin(companies, eq(companies.siren, siren))
      .where(or(...stale))
      .groupBy(siren)
      .orderBy(siren)
      .limit(limit);
  }

  async save(
    siren: string,
    record: CompanyRecord | null,
    at: Date,
    page?: EmployerPage | null,
    logo?: string | null,
  ) {
    const logoValues =
      logo === undefined ? {} : { logoReadAt: at, logoUrl: logo };
    const pageValues =
      page === undefined
        ? {}
        : {
            employerPageEdited: page?.edited ?? false,
            employerPageOffers: page?.offers ?? null,
            employerPagePath: page?.path ?? null,
            employerPageReadAt: at,
          };
    const values = record
      ? {
          ...withoutDeclared(record),
          ...pageValues,
          ...logoValues,
          found: true,
          refreshedAt: at,
          siren,
        }
      : // Unknown or not, Wikidata was asked: not due again for its logo.
        { ...logoValues, found: false, publishable: false, refreshedAt: at, siren };

    await this.db
      .insert(companies)
      .values(values)
      .onConflictDoUpdate({
        // An unknown SIREN keeps nothing of an older record.
        set: record ? values : { ...EMPTY, ...values },
        target: companies.siren,
      });
  }

  async findMany(sirens: readonly string[]) {
    if (sirens.length === 0) return [];

    return this.db
      .select()
      .from(companies)
      .where(inArray(companies.siren, [...sirens]));
  }
}

function withoutDeclared(record: CompanyRecord) {
  const { egaproDeclared: _declared, ...rest } = record;
  return rest;
}

const EMPTY = {
  category: "",
  closed: false,
  createdOn: null,
  egaproScore: null,
  egaproYear: null,
  employerPageEdited: false,
  employerPageOffers: null,
  employerPagePath: null,
  employerPageReadAt: null,
  ess: false,
  financesYear: null,
  gesReport: false,
  headcountBand: "",
  inclusive: false,
  legalName: "",
  logoReadAt: null,
  logoUrl: null,
  mission: false,
  nafCode: "",
  netIncome: null,
  openEstablishments: null,
  publishable: false,
  revenue: null,
} satisfies Omit<StoredCompany, "found" | "refreshedAt" | "siren">;

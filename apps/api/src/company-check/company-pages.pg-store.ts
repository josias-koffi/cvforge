import { and, asc, desc, eq, isNotNull, ne, notInArray, or, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  companies,
  hiringCompanies,
  hiringCompanyQueries,
  marketStats,
} from "../database/schema";
import type { StoredCompany } from "../companies/company-record";
import { INDEXABLE_MARKET_STATS } from "../market/market-stats.pg-store";

/** DI token for the company pages' reads. */
export const COMPANY_PAGES_STORE = Symbol("COMPANY_PAGES_STORE");

/** INSEE's bands for "unknown" and "no employee": not a figure to show. */
const UNKNOWN_HEADCOUNT = ["", "NN"];

export interface IndexableCompany {
  siren: string;
  legalName: string;
  refreshedAt: Date;
}

export interface CompanyHiringRow {
  romeCode: string;
  romeLabel: string;
  department: string;
  city: string;
  hasMarketPage: boolean;
}

/**
 * Whether a company read by the refresh gets a public page (US-140): named,
 * public, open, with an activity and at least one more fact. A title, a NAF
 * code and "not published" everywhere else is thin content.
 */
export function isIndexableCompany(company: StoredCompany): boolean {
  return (
    company.found &&
    company.publishable === true &&
    !company.closed &&
    company.nafCode !== "" &&
    (!UNKNOWN_HEADCOUNT.includes(company.headcountBand) ||
      company.financesYear !== null ||
      company.mission ||
      company.ess ||
      company.inclusive ||
      company.gesReport ||
      company.egaproScore !== null ||
      company.employerPagePath !== null)
  );
}

/** `isIndexableCompany` in SQL. */
const INDEXABLE = and(
  eq(companies.found, true),
  eq(companies.publishable, true),
  eq(companies.closed, false),
  ne(companies.nafCode, ""),
  or(
    notInArray(companies.headcountBand, UNKNOWN_HEADCOUNT),
    isNotNull(companies.financesYear),
    eq(companies.mission, true),
    eq(companies.ess, true),
    eq(companies.inclusive, true),
    eq(companies.gesReport, true),
    isNotNull(companies.egaproScore),
    isNotNull(companies.employerPagePath),
  ),
);

/** The largest companies first: "NN" and "" last, then INSEE's band down. */
const BY_SIZE = [
  asc(sql`${companies.headcountBand} in ('', 'NN')`),
  desc(companies.headcountBand),
  asc(companies.siren),
];

export interface CompanyPagesStore {
  listIndexable(limit: number): Promise<IndexableCompany[]>;
  listIndexableByNaf(nafCode: string, limit: number): Promise<IndexableCompany[]>;
  /** The jobs its establishments hire for, one row per job and department. */
  hiring(siren: string, limit: number): Promise<CompanyHiringRow[]>;
}

export class PgCompanyPagesStore implements CompanyPagesStore {
  constructor(private readonly db: Database) {}

  listIndexable(limit: number) {
    return this.select().where(INDEXABLE).orderBy(...BY_SIZE).limit(limit);
  }

  listIndexableByNaf(nafCode: string, limit: number) {
    return this.select()
      .where(and(INDEXABLE, eq(companies.nafCode, nafCode)))
      .orderBy(...BY_SIZE)
      .limit(limit);
  }

  async hiring(siren: string, limit: number) {
    const romeCode = hiringCompanyQueries.romeCode;
    const department = hiringCompanies.department;

    return this.db
      .select({
        city: sql<string>`min(${hiringCompanies.city})`,
        department,
        hasMarketPage: sql<boolean>`coalesce(bool_or(${INDEXABLE_MARKET_STATS}), false)`,
        romeCode,
        romeLabel: sql<string>`coalesce(nullif(max(${hiringCompanyQueries.romeLabel}), ''), max(${marketStats.romeLabel}), ${romeCode})`,
      })
      .from(hiringCompanies)
      .innerJoin(
        hiringCompanyQueries,
        eq(hiringCompanyQueries.queryKey, hiringCompanies.queryKey),
      )
      .leftJoin(
        marketStats,
        and(
          eq(marketStats.romeCode, romeCode),
          eq(marketStats.department, department),
        ),
      )
      .where(
        and(
          sql`left(${hiringCompanies.siret}, 9) = ${siren}`,
          ne(department, ""),
        ),
      )
      .groupBy(romeCode, department)
      .orderBy(romeCode, department)
      .limit(limit);
  }

  private select() {
    return this.db
      .select({
        legalName: companies.legalName,
        refreshedAt: companies.refreshedAt,
        siren: companies.siren,
      })
      .from(companies);
  }
}

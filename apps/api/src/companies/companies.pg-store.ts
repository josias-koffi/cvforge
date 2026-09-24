import { eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { companies, hiringCompanies } from "../database/schema";
import type { CompanyRecord, StoredCompany } from "./company-record";

/** DI token for the companies' store. */
export const COMPANIES_STORE = Symbol("COMPANIES_STORE");

export interface CompaniesStore {
  /** Hiring establishments' SIRENs never read, or read before `before`. */
  sirensDue(before: Date, limit: number): Promise<string[]>;
  /** `null` records an unknown SIREN, so it is not asked again at once. */
  save(siren: string, record: CompanyRecord | null, at: Date): Promise<void>;
  findMany(sirens: readonly string[]): Promise<StoredCompany[]>;
}

export class PgCompaniesStore implements CompaniesStore {
  constructor(private readonly db: Database) {}

  async sirensDue(before: Date, limit: number) {
    const siren = sql<string>`left(${hiringCompanies.siret}, 9)`;
    const rows = await this.db
      .selectDistinct({ siren })
      .from(hiringCompanies)
      .leftJoin(companies, eq(companies.siren, siren))
      .where(or(isNull(companies.siren), lt(companies.refreshedAt, before)))
      .orderBy(siren)
      .limit(limit);

    return rows.map((row) => row.siren);
  }

  async save(siren: string, record: CompanyRecord | null, at: Date) {
    const values = record
      ? { ...withoutDeclared(record), found: true, refreshedAt: at, siren }
      : { found: false, refreshedAt: at, siren };

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
  ess: false,
  financesYear: null,
  gesReport: false,
  headcountBand: "",
  inclusive: false,
  legalName: "",
  mission: false,
  nafCode: "",
  netIncome: null,
  openEstablishments: null,
  revenue: null,
} satisfies Omit<CompanyRecord, "egaproDeclared">;

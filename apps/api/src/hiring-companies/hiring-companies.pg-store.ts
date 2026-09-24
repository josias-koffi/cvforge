import { eq, inArray } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { hiringCompanies, hiringCompanyQueries } from "../database/schema";
import type { LbbCompany, LbbReading } from "./la-bonne-boite.source";

/** DI token for the hiring companies' store. */
export const HIRING_COMPANIES_STORE = Symbol("HIRING_COMPANIES_STORE");

export interface StoredHiringQuery {
  queryKey: string;
  romeCode: string;
  romeLabel: string;
  refreshedAt: Date;
}

export interface StoredHiringCompany extends LbbCompany {
  queryKey: string;
}

export interface HiringCompaniesStore {
  queries(keys: readonly string[]): Promise<StoredHiringQuery[]>;
  companies(keys: readonly string[]): Promise<StoredHiringCompany[]>;
  /** Replaces one query's companies as a whole, in one transaction. */
  replace(
    query: { queryKey: string; romeCode: string; place: string },
    reading: LbbReading,
    at: Date,
  ): Promise<void>;
}

export class PgHiringCompaniesStore implements HiringCompaniesStore {
  constructor(private readonly db: Database) {}

  async queries(keys: readonly string[]) {
    if (keys.length === 0) return [];

    return this.db
      .select({
        queryKey: hiringCompanyQueries.queryKey,
        refreshedAt: hiringCompanyQueries.refreshedAt,
        romeCode: hiringCompanyQueries.romeCode,
        romeLabel: hiringCompanyQueries.romeLabel,
      })
      .from(hiringCompanyQueries)
      .where(inArray(hiringCompanyQueries.queryKey, [...keys]));
  }

  async companies(keys: readonly string[]) {
    if (keys.length === 0) return [];

    return this.db
      .select()
      .from(hiringCompanies)
      .where(inArray(hiringCompanies.queryKey, [...keys]));
  }

  async replace(
    query: { queryKey: string; romeCode: string; place: string },
    reading: LbbReading,
    at: Date,
  ) {
    const values = {
      hits: reading.hits,
      place: query.place,
      queryKey: query.queryKey,
      refreshedAt: at,
      romeCode: query.romeCode,
      romeLabel: reading.romeLabel,
    };

    await this.db.transaction(async (tx) => {
      await tx
        .insert(hiringCompanyQueries)
        .values(values)
        .onConflictDoUpdate({ set: values, target: hiringCompanyQueries.queryKey });
      await tx
        .delete(hiringCompanies)
        .where(eq(hiringCompanies.queryKey, query.queryKey));

      if (reading.companies.length > 0) {
        await tx
          .insert(hiringCompanies)
          .values(
            reading.companies.map((company) => ({
              ...company,
              queryKey: query.queryKey,
            })),
          )
          // One establishment listed twice in a page must not fail the reading.
          .onConflictDoNothing();
      }
    });
  }
}

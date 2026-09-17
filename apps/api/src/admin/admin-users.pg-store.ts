import type { AccountStatus } from "@cvforge/types";
import { and, asc, count, desc, eq, gte, inArray, lte, max, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  authAccounts,
  creditBalances,
  creditLedgerEntries,
} from "../database/schema";
import type {
  AdminUserRow,
  AdminUsersStore,
  DirectoryFilters,
} from "./admin-users.types";

type BalanceBand = NonNullable<DirectoryFilters["balance"]>;

/** Bands rather than a free-form number: the admin filters, not queries. */
const BALANCE_BANDS: Record<BalanceBand, { max?: number; min?: number }> = {
  empty: { max: 0 },
  low: { max: 19, min: 1 },
  stocked: { min: 20 },
};

export class PgAdminUsersStore implements AdminUsersStore {
  constructor(private readonly db: Database) {}

  /**
   * Filters, sorts and paginates in SQL. The previous version loaded every
   * account, filtered in JS and then ran one balance query per match; this
   * runs two queries whatever the number of accounts, plus one for the manual
   * grants of the current page only.
   */
  async listDirectory(input: {
    filters: DirectoryFilters;
    limit: number;
    offset: number;
  }): Promise<{ rows: AdminUserRow[]; totalItems: number }> {
    const { balance, query, role, status } = input.filters;
    const conditions = [];

    if (role) {
      conditions.push(eq(authAccounts.role, role));
    }

    if (status) {
      conditions.push(eq(authAccounts.status, status));
    }

    if (query) {
      conditions.push(sql`${authAccounts.email} like ${`%${query}%`}`);
    }

    if (balance) {
      const band = BALANCE_BANDS[balance];
      // No balance row means no credits yet, so treat a missing row as zero.
      const effectiveBalance = sql<number>`coalesce(${creditBalances.balance}, 0)`;

      if (band.min !== undefined) {
        conditions.push(gte(effectiveBalance, band.min));
      }

      if (band.max !== undefined) {
        conditions.push(lte(effectiveBalance, band.max));
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const activity = this.db
      .select({
        entries: count().as("entries"),
        lastActivityAt: max(creditLedgerEntries.createdAt).as("last_activity_at"),
        userEmail: creditLedgerEntries.userEmail,
      })
      .from(creditLedgerEntries)
      .groupBy(creditLedgerEntries.userEmail)
      .as("activity");

    const [rows, totals] = await Promise.all([
      this.db
        .select({
          balance: sql<number>`coalesce(${creditBalances.balance}, 0)`,
          consent: authAccounts.consent,
          createdAt: authAccounts.createdAt,
          email: authAccounts.email,
          lastActivityAt: activity.lastActivityAt,
          ledgerEntryCount: sql<number>`coalesce(${activity.entries}, 0)`,
          role: authAccounts.role,
          sessionsValidFrom: authAccounts.sessionsValidFrom,
          status: authAccounts.status,
        })
        .from(authAccounts)
        .leftJoin(creditBalances, eq(creditBalances.userEmail, authAccounts.email))
        .leftJoin(activity, eq(activity.userEmail, authAccounts.email))
        .where(where)
        .orderBy(
          desc(sql`coalesce(${activity.lastActivityAt}, ${authAccounts.createdAt})`),
          asc(authAccounts.email),
        )
        .limit(input.limit)
        .offset(input.offset),
      this.db
        .select({ total: count() })
        .from(authAccounts)
        .leftJoin(creditBalances, eq(creditBalances.userEmail, authAccounts.email))
        .where(where),
    ]);

    const grants = await this.readLastManualGrants(rows.map((row) => row.email));

    return {
      rows: rows.map((row) => ({
        balance: Number(row.balance),
        consent: row.consent ?? null,
        email: row.email,
        lastActivityAt:
          row.lastActivityAt?.toISOString() ?? row.createdAt.toISOString(),
        lastManualGrant: grants.get(row.email) ?? null,
        ledgerEntryCount: Number(row.ledgerEntryCount),
        role: row.role,
        sessionsValidFrom: row.sessionsValidFrom?.toISOString() ?? null,
        status: row.status as AccountStatus,
      })),
      totalItems: Number(totals[0]?.total ?? 0),
    };
  }

  /** One query for the page's accounts, not one per account. */
  private async readLastManualGrants(emails: string[]) {
    const grants = new Map<string, AdminUserRow["lastManualGrant"]>();

    if (emails.length === 0) {
      return grants;
    }

    const rows = await this.db
      .select({
        amount: creditLedgerEntries.amount,
        createdAt: creditLedgerEntries.createdAt,
        metadata: creditLedgerEntries.metadata,
        note: creditLedgerEntries.note,
        userEmail: creditLedgerEntries.userEmail,
      })
      .from(creditLedgerEntries)
      .where(
        and(
          inArray(creditLedgerEntries.userEmail, emails),
          eq(creditLedgerEntries.type, "admin_grant"),
        ),
      )
      .orderBy(desc(creditLedgerEntries.createdAt));

    for (const row of rows) {
      // Rows come newest first, so the first one per account wins.
      if (!grants.has(row.userEmail)) {
        grants.set(row.userEmail, {
          adminEmail: row.metadata.adminEmail ?? null,
          amount: row.amount,
          createdAt: row.createdAt.toISOString(),
          note: row.note,
        });
      }
    }

    return grants;
  }
}

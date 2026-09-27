import type { CreditHistoryKind, CreditLedgerEntry } from "@cvforge/types";
import { and, count, desc, eq, gt, lt, ne, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { creditBalances, creditLedgerEntries } from "../database/schema";
import type {
  ApplyLedgerEntryResult,
  CreditLedgerEntryDraft,
  CreditLedgerStore,
} from "./credits.types";

export const DELETED_ACCOUNT_MARKER = "[deleted-account]";

type LedgerRow = typeof creditLedgerEntries.$inferSelect;

function toEntry(row: LedgerRow): CreditLedgerEntry {
  return {
    action: row.action,
    amount: row.amount,
    balanceAfter: row.balanceAfter,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    metadata: row.metadata ?? {},
    note: row.note,
    type: row.type,
    userEmail: row.userEmail,
  };
}

export class PgCreditLedgerStore implements CreditLedgerStore {
  constructor(private readonly db: Database) {}

  applyEntry(
    draft: CreditLedgerEntryDraft,
    idempotencyKey?: string,
  ): Promise<ApplyLedgerEntryResult> {
    return this.db.transaction(async (tx) => {
      await tx
        .insert(creditBalances)
        .values({ userEmail: draft.userEmail })
        .onConflictDoNothing();
      const [{ balance }] = await tx
        .select({ balance: creditBalances.balance })
        .from(creditBalances)
        .where(eq(creditBalances.userEmail, draft.userEmail))
        .for("update");

      if (idempotencyKey) {
        const [existing] = await tx
          .select()
          .from(creditLedgerEntries)
          .where(eq(creditLedgerEntries.idempotencyKey, idempotencyKey));

        if (existing) {
          return { status: "duplicate", entry: toEntry(existing) };
        }
      }

      const balanceAfter = balance + draft.amount;

      if (balanceAfter < 0) {
        return { status: "insufficient_balance", balance };
      }

      const [row] = await tx
        .insert(creditLedgerEntries)
        .values({ ...draft, balanceAfter, idempotencyKey })
        .returning();
      await tx
        .update(creditBalances)
        .set({ balance: balanceAfter, updatedAt: sql`now()` })
        .where(eq(creditBalances.userEmail, draft.userEmail));

      return { status: "applied", entry: toEntry(row) };
    });
  }

  async getBalance(userEmail: string) {
    const [row] = await this.db
      .select({ balance: creditBalances.balance })
      .from(creditBalances)
      .where(eq(creditBalances.userEmail, userEmail));

    return row?.balance ?? 0;
  }

  async listEntriesForUser(userEmail: string) {
    const rows = await this.db
      .select()
      .from(creditLedgerEntries)
      .where(eq(creditLedgerEntries.userEmail, userEmail))
      .orderBy(desc(creditLedgerEntries.seq));

    return rows.map(toEntry);
  }

  async listEntriesPageForUser(
    userEmail: string,
    query: { kind?: CreditHistoryKind; limit: number; offset: number },
  ) {
    const where = and(
      eq(creditLedgerEntries.userEmail, userEmail),
      query.kind === "spent" ? lt(creditLedgerEntries.amount, 0) : undefined,
      query.kind === "earned" ? gt(creditLedgerEntries.amount, 0) : undefined,
    );
    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(creditLedgerEntries)
        .where(where)
        .orderBy(desc(creditLedgerEntries.seq))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ total: count() }).from(creditLedgerEntries).where(where),
    ]);

    return {
      entries: rows.map(toEntry),
      totalItems: Number(totals[0]?.total ?? 0),
    };
  }

  async listEntriesByAdminEmail(adminEmail: string) {
    const rows = await this.db
      .select()
      .from(creditLedgerEntries)
      .where(sql`${creditLedgerEntries.metadata}->>'adminEmail' = ${adminEmail}`)
      .orderBy(desc(creditLedgerEntries.seq));

    return rows.map(toEntry);
  }

  deleteByUserEmail(userEmail: string) {
    return this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(creditLedgerEntries)
        .where(eq(creditLedgerEntries.userEmail, userEmail))
        .returning({ id: creditLedgerEntries.id });
      await tx
        .delete(creditBalances)
        .where(eq(creditBalances.userEmail, userEmail));

      return deleted.length;
    });
  }

  async anonymizeAdminReferences(adminEmail: string) {
    const scrubbed = await this.db
      .update(creditLedgerEntries)
      .set({
        metadata: sql`jsonb_set(${creditLedgerEntries.metadata}, '{adminEmail}', to_jsonb(${DELETED_ACCOUNT_MARKER}::text))`,
      })
      .where(
        and(
          sql`${creditLedgerEntries.metadata}->>'adminEmail' = ${adminEmail}`,
          ne(creditLedgerEntries.userEmail, adminEmail),
        ),
      )
      .returning({ id: creditLedgerEntries.id });

    return scrubbed.length;
  }
}

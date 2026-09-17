import type { CreditLedgerEntry } from "@cvforge/types";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { Database } from "./database.types";
import { creditBalances, creditLedgerEntries, dataImports } from "./schema";

export const LEGACY_CREDITS_IMPORT = "credits-state.json";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LegacyCreditsImportResult =
  | { status: "already_imported" }
  | { status: "imported"; entries: number; users: number };

function readLegacyEntries(filePath: string): CreditLedgerEntry[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
    entries?: CreditLedgerEntry[];
  };

  return Array.isArray(parsed.entries) ? parsed.entries : [];
}

function idempotencyKeyFor(entry: CreditLedgerEntry) {
  const sessionId = entry.metadata?.stripeCheckoutSessionId;

  return entry.type === "stripe_purchase" && sessionId
    ? `stripe:checkout:${sessionId}`
    : null;
}

/**
 * Copies the JSON ledger into Postgres once per environment, oldest entry
 * first so `seq` keeps the historical order. Each user's balance is the
 * `balanceAfter` of their latest entry, exactly as the file store computed it.
 * A missing file is recorded as imported too: there is nothing left to copy.
 */
export async function importLegacyCredits(
  db: Database,
  filePath: string,
): Promise<LegacyCreditsImportResult> {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .insert(dataImports)
      .values({ name: LEGACY_CREDITS_IMPORT })
      .onConflictDoNothing()
      .returning({ name: dataImports.name });

    if (claimed.length === 0) {
      return { status: "already_imported" };
    }

    const entries = readLegacyEntries(filePath).sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
    const balances = new Map<string, number>();

    for (const entry of entries) {
      await tx.insert(creditLedgerEntries).values({
        action: entry.action,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        createdAt: new Date(entry.createdAt),
        id: UUID_PATTERN.test(entry.id) ? entry.id : randomUUID(),
        idempotencyKey: idempotencyKeyFor(entry),
        metadata: entry.metadata ?? {},
        note: entry.note ?? null,
        type: entry.type,
        userEmail: entry.userEmail,
      });
      balances.set(entry.userEmail, entry.balanceAfter);
    }

    for (const [userEmail, balance] of balances) {
      await tx.insert(creditBalances).values({ balance, userEmail });
    }

    return { status: "imported", entries: entries.length, users: balances.size };
  });
}

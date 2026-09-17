import type { CreditLedgerEntry } from "@cvforge/types";
import {
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Current balance per user. Every ledger write locks this row
 * (`SELECT … FOR UPDATE`) so concurrent debits and credits serialise.
 */
export const creditBalances = pgTable("credit_balances", {
  userEmail: text("user_email").primaryKey(),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const creditLedgerEntries = pgTable(
  "credit_ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Insertion order: `created_at` alone ties within one millisecond.
    seq: bigserial("seq", { mode: "number" }).notNull(),
    userEmail: text("user_email").notNull(),
    type: text("type").$type<CreditLedgerEntry["type"]>().notNull(),
    action: text("action").$type<CreditLedgerEntry["action"]>().notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    note: text("note"),
    metadata: jsonb("metadata")
      .$type<CreditLedgerEntry["metadata"]>()
      .notNull()
      .default({}),
    // Set for writes that must happen once, e.g. `stripe:checkout:<session id>`.
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("credit_ledger_entries_user_seq_idx").on(table.userEmail, table.seq),
  ],
);

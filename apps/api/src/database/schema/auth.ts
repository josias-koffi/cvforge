import type { AccountStatus } from "@cvforge/types";
import type { AuthConsentRecord, AuthRole } from "../../auth/auth.types";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const authAccounts = pgTable(
  "auth_accounts",
  {
    email: text("email").primaryKey(),
    role: text("role").$type<AuthRole>().notNull(),
    consent: jsonb("consent").$type<AuthConsentRecord | null>(),
    status: text("status")
      .$type<AccountStatus>()
      .notNull()
      .default("active"),
    /**
     * Sessions issued before this instant are refused. Session cookies are
     * stateless HMACs with no server-side record, so this timestamp is what
     * makes revocation possible at all: suspending or force-logging-out an
     * account moves it to now, and every cookie already in the wild becomes
     * invalid without a session table or a write per sign-in.
     */
    sessionsValidFrom: timestamp("sessions_valid_from", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("auth_accounts_role_valid", sql`${table.role} in ('admin', 'user')`),
    check(
      "auth_accounts_status_valid",
      sql`${table.status} in ('active', 'suspended')`,
    ),
  ],
);

export const authInvitations = pgTable(
  "auth_invitations",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    role: text("role").$type<AuthRole>().notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "auth_invitations_role_valid",
      sql`${table.role} in ('admin', 'user')`,
    ),
    index("auth_invitations_email_idx").on(table.email),
    index("auth_invitations_created_by_idx").on(table.createdBy),
  ],
);

/**
 * The "first account becomes admin" latch, one row.
 *
 * Stored rather than derived from `exists(admin)`. The two agree only while
 * `AuthService.demoteAccountToUser` keeps refusing to demote the last admin: drop
 * that service-level guard and a derived latch would re-open the bootstrap,
 * handing admin to the next person who signs in. A column does not depend on
 * that guard staying in place.
 *
 * The latch is set when an account becomes admin, and cleared only when an
 * admin is *purged* and none remains — the deliberate way back in after
 * deleting the last admin, which is what the file store did.
 */
export const authSettings = pgTable("auth_settings", {
  id: text("id").primaryKey().default("singleton"),
  bootstrapConsumed: boolean("bootstrap_consumed").notNull().default(false),
});

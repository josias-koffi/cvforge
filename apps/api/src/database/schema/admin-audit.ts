import type { AdminAuditAction, AdminAuditEntry } from "@cvforge/types";
import { adminAuditActions } from "@cvforge/types";
import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const ACTION_LIST = adminAuditActions.map((action) => `'${action}'`).join(", ");

/**
 * Every consequential admin action, append-only.
 *
 * Emails are stored, not foreign keys: the point of the log is to survive the
 * deletion of the account it describes, and `account_deleted` would otherwise
 * erase its own record. The RGPD purge scrubs the *target* of entries about a
 * deleted person while keeping the action itself auditable.
 */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").$type<AdminAuditAction>().notNull(),
    targetEmail: text("target_email"),
    note: text("note"),
    metadata: jsonb("metadata")
      .$type<AdminAuditEntry["metadata"]>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "admin_audit_log_action_valid",
      sql.raw(`"action" in (${ACTION_LIST})`),
    ),
    index("admin_audit_log_created_idx").on(table.createdAt),
    index("admin_audit_log_target_idx").on(table.targetEmail),
  ],
);

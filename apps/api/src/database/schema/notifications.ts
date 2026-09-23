import type {
  InAppNotification,
  NotificationPreferences,
  NotificationType,
} from "@cvforge/types";
import { desc, sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * One row per in-app notification. The file store kept them in a single
 * unindexed array rewritten on every insert; the listing index below is what
 * that array scan becomes.
 *
 * Ids stay `text` rather than `uuid`. The service mints them with
 * `randomUUID`, but the legacy file was never constrained, so `text` imports
 * whatever production holds without remapping. Nothing references a
 * notification from outside this table.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userEmail: text("user_email").notNull(),
    type: text("type").$type<NotificationType>().notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    linkHref: text("link_href").notNull().default(""),
    metadata: jsonb("metadata")
      .$type<InAppNotification["metadata"]>()
      .notNull()
      .default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_user_created_idx").on(
      table.userEmail,
      desc(table.createdAt),
    ),
  ],
);

/** Per-user email opt-outs. Absent row means "everything on", as before. */
export const notificationPreferences = pgTable("notification_preferences", {
  userEmail: text("user_email").primaryKey(),
  email: jsonb("email")
    .$type<NotificationPreferences["email"]>()
    .notNull()
    .default(sql`'{"applicationFollowUp": true, "creditPurchaseConfirmed": true, "jobDigest": true}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

import type { SubmissionField } from "@cvforge/types";
import {
  boolean,
  customType,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { applications } from "./applications";
import { authAccounts } from "./auth";

const bytea = customType<{ data: Buffer; driverData: Uint8Array }>({
  dataType: () => "bytea",
  // The driver hands back a Uint8Array: StreamableFile and base64 want a Buffer.
  fromDriver: (value) => Buffer.from(value),
});

/**
 * Proof of an application the Chrome extension sent (ADR-034 §7, US-198):
 * what was filled, which documents, the confirmation page and a screenshot
 * of it. Goes with the application and with the account.
 */
export const applicationSubmissions = pgTable(
  "application_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    userEmail: text("user_email")
      .notNull()
      .references(() => authAccounts.email, { onDelete: "cascade" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    formUrl: text("form_url").notNull(),
    /** Null when no confirmation page was seen: the sending is "to check". */
    confirmationUrl: text("confirmation_url"),
    confirmed: boolean("confirmed").notNull(),
    documents: jsonb("documents").$type<string[]>().notNull(),
    fields: jsonb("fields").$type<SubmissionField[]>().notNull(),
    screenshot: bytea("screenshot"),
    screenshotType: text("screenshot_type"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("application_submissions_application_idx").on(table.applicationId),
  ],
);

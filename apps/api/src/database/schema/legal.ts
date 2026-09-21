import type { LegalDocumentSlug, LocalizedText } from "@cvforge/types";
import { sql } from "drizzle-orm";
import { check, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * The legal documents, edited from the back-office. One row per document:
 * both languages travel together because they are published together — a
 * French update that leaves the English behind would be worse than useless.
 *
 * `body` is plain text following the convention the landing parses; it is
 * never HTML, and nothing renders it as markup.
 */
export const legalDocuments = pgTable(
  "legal_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").$type<LegalDocumentSlug>().notNull().unique(),
    title: jsonb("title").$type<LocalizedText>().notNull(),
    body: jsonb("body").$type<LocalizedText>().notNull(),
    version: integer("version").notNull().default(0),
    /** Null while the document is a draft; drafts are never served publicly. */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "legal_documents_slug_valid",
      sql`${table.slug} in ('terms', 'sales-terms', 'legal-notice', 'privacy')`,
    ),
    check("legal_documents_version_positive", sql`${table.version} >= 0`),
  ],
);

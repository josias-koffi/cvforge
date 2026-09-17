import type {
  ApplicationStatus,
  ApplicationStatusHistoryEntry,
  CVDocumentContent,
  DocumentVersionSource,
  ExtractedOfferFields,
  InterviewReport,
  LetterDocumentContent,
} from "@cvforge/types";
import { desc } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * One row per application. The offer, the generated documents and the status
 * history stay `jsonb`: each is read and written whole, and none of them is
 * queried field by field. The document *versions* are the exception — they
 * grow without bound and are appended one at a time — so they get their own
 * tables below.
 *
 * Ids stay `text`. The service mints UUIDs, but the legacy file was never
 * constrained, and `profile_id` / `cv_template_id` point at rows whose own ids
 * are slugs.
 */
export const applications = pgTable(
  "applications",
  {
    id: text("id").primaryKey(),
    userEmail: text("user_email").notNull(),
    status: text("status").$type<ApplicationStatus>().notNull(),
    statusHistory: jsonb("status_history")
      .$type<ApplicationStatusHistoryEntry[]>()
      .notNull()
      .default([]),
    sourceType: text("source_type").$type<"url" | "text">().notNull(),
    sourceLabel: text("source_label").notNull().default(""),
    offerUrl: text("offer_url"),
    rawOfferText: text("raw_offer_text").notNull().default(""),
    offerTextPreview: text("offer_text_preview").notNull().default(""),
    extracted: jsonb("extracted").$type<ExtractedOfferFields>().notNull(),
    profileId: text("profile_id"),
    cvContent: jsonb("cv_content").$type<CVDocumentContent | null>(),
    cvGeneratedAt: timestamp("cv_generated_at", { withTimezone: true }),
    cvTemplateId: text("cv_template_id"),
    letterContent: jsonb("letter_content").$type<LetterDocumentContent | null>(),
    letterGeneratedAt: timestamp("letter_generated_at", { withTimezone: true }),
    letterTemplateId: text("letter_template_id"),
    interviewReports: jsonb("interview_reports")
      .$type<InterviewReport[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    // `listByUserEmail` orders by creation, `listAll` by last change.
    index("applications_user_created_idx").on(
      table.userEmail,
      desc(table.createdAt),
    ),
    index("applications_updated_idx").on(desc(table.updatedAt)),
    // Template usage counts, which the analytics page reads for every template.
    index("applications_cv_template_idx").on(table.cvTemplateId),
    index("applications_letter_template_idx").on(table.letterTemplateId),
  ],
);

/**
 * Column builders carry state, so each table needs its own set rather than a
 * shared object spread twice.
 */
function versionColumns() {
  return {
    id: text("id").primaryKey(),
    applicationId: text("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    source: text("source").$type<DocumentVersionSource>().notNull(),
    templateId: text("template_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  };
}

export const applicationCvVersions = pgTable(
  "application_cv_versions",
  {
    ...versionColumns(),
    content: jsonb("content").$type<CVDocumentContent>().notNull(),
  },
  (table) => [
    index("application_cv_versions_app_idx").on(
      table.applicationId,
      table.versionNumber,
    ),
  ],
);

export const applicationLetterVersions = pgTable(
  "application_letter_versions",
  {
    ...versionColumns(),
    content: jsonb("content").$type<LetterDocumentContent>().notNull(),
  },
  (table) => [
    index("application_letter_versions_app_idx").on(
      table.applicationId,
      table.versionNumber,
    ),
  ],
);

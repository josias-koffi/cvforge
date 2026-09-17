import type { Locale, TemplateKind, TemplateLayoutData } from "@cvforge/types";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * CV and cover-letter templates edited in the back-office. Ids stay `text`
 * rather than `uuid`: the two seeded ATS templates are addressed by slug
 * (`template-cv-ats`, `template-letter-ats`) and the front-end links to them.
 */
export const templates = pgTable(
  "templates",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    kind: text("kind").$type<TemplateKind>().notNull(),
    locale: text("locale").$type<Locale>().notNull().default("fr"),
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    layout: jsonb("layout").$type<TemplateLayoutData>().notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("templates_kind_valid", sql`${table.kind} in ('cv', 'letter')`),
    check("templates_locale_valid", sql`${table.locale} in ('fr', 'en')`),
    // Exactly what the service used to enforce by rewriting sibling rows.
    uniqueIndex("templates_single_default_per_kind_idx")
      .on(table.kind)
      .where(sql`${table.isDefault}`),
  ],
);

import type {
  ApprenticeshipPreferences,
  InternshipPreferences,
  SearchCompanySize,
  SearchCompanyValue,
  SearchContractType,
  SearchExperienceLevel,
  SearchLocation,
  SearchRemoteMode,
  SearchSectorId,
} from "@cvforge/types";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * One search project per profile: what the candidate is looking for.
 *
 * **No foreign key to `profiles.id` on purpose.** `PgProfilesStore.save`
 * replaces a user's whole registry by deleting and re-inserting every row, so
 * a cascade there would wipe the search project on each profile save. The link
 * is `(user_email, profile_id)` and the rows are cleaned up with the account,
 * next to the other per-user deletions.
 */
export const searchProjects = pgTable(
  "search_projects",
  {
    userEmail: text("user_email").notNull(),
    profileId: text("profile_id").notNull(),
    targetRoles: jsonb("target_roles").$type<string[]>().notNull().default([]),
    experienceLevel: text("experience_level").$type<SearchExperienceLevel>(),
    contractTypes: jsonb("contract_types")
      .$type<SearchContractType[]>()
      .notNull()
      .default([]),
    partTimeOk: boolean("part_time_ok").notNull().default(false),
    internship: jsonb("internship").$type<InternshipPreferences>(),
    apprenticeship: jsonb("apprenticeship").$type<ApprenticeshipPreferences>(),
    sectors: jsonb("sectors").$type<SearchSectorId[]>().notNull().default([]),
    excludedSectors: jsonb("excluded_sectors")
      .$type<SearchSectorId[]>()
      .notNull()
      .default([]),
    locations: jsonb("locations").$type<SearchLocation[]>().notNull().default([]),
    remote: text("remote").$type<SearchRemoteMode>().notNull().default("any"),
    nationalMobility: boolean("national_mobility").notNull().default(false),
    salaryMinYearly: integer("salary_min_yearly"),
    companySizes: jsonb("company_sizes")
      .$type<SearchCompanySize[]>()
      .notNull()
      .default([]),
    companyValues: jsonb("company_values")
      .$type<SearchCompanyValue[]>()
      .notNull()
      .default([]),
    excludedCompanies: jsonb("excluded_companies")
      .$type<string[]>()
      .notNull()
      .default([]),
    digestEnabled: boolean("digest_enabled").notNull().default(false),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    aiRerankEnabled: boolean("ai_rerank_enabled").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("search_projects_user_profile_idx").on(
      table.userEmail,
      table.profileId,
    ),
    // The morning digest reads every enabled project, nothing else.
    index("search_projects_digest_idx").on(table.digestEnabled),
  ],
);

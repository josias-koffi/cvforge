import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * A local copy of the ROME 4.0 referential, France Travail's list of jobs and
 * skills (ADR-024). Autocomplete, scoring and joins read it here and never
 * call the API; `rome:sync` replaces it as a whole, once a week.
 */
export const romeMetiers = pgTable("rome_metiers", {
  code: text("code").primaryKey(),
  libelle: text("libelle").notNull(),
  domaineCode: text("domaine_code").notNull(),
  domaineLibelle: text("domaine_libelle").notNull(),
  grandDomaineCode: text("grand_domaine_code").notNull(),
  grandDomaineLibelle: text("grand_domaine_libelle").notNull(),
});

export const romeAppellations = pgTable(
  "rome_appellations",
  {
    code: text("code").primaryKey(),
    libelle: text("libelle").notNull(),
    libelleCourt: text("libelle_court").notNull(),
    /** Lower case, no accents: what an autocomplete compares with. */
    libelleSearch: text("libelle_search").notNull(),
    metierCode: text("metier_code")
      .notNull()
      .references(() => romeMetiers.code),
  },
  (table) => [index("rome_appellations_metier_idx").on(table.metierCode)],
);

export const romeCompetences = pgTable(
  "rome_competences",
  {
    code: text("code").primaryKey(),
    /** `SAVOIR`, `COMPETENCE-DETAILLEE`, `MACRO-SAVOIR-FAIRE`, `MACRO-SAVOIR-ETRE-PROFESSIONNEL`. */
    type: text("type").notNull(),
    libelle: text("libelle").notNull(),
  },
  (table) => [index("rome_competences_type_idx").on(table.type)],
);

export const romeMetierCompetences = pgTable(
  "rome_metier_competences",
  {
    metierCode: text("metier_code")
      .notNull()
      .references(() => romeMetiers.code),
    competenceCode: text("competence_code")
      .notNull()
      .references(() => romeCompetences.code),
  },
  (table) => [
    primaryKey({ columns: [table.metierCode, table.competenceCode] }),
    index("rome_metier_competences_competence_idx").on(table.competenceCode),
  ],
);

/**
 * A code France Travail retired, and the one that replaces it. Applied to
 * every table that stores a ROME code, then stamped, so a replay does nothing.
 */
export const romeSubstitutions = pgTable(
  "rome_substitutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entity: text("entity").notNull(),
    oldCode: text("old_code").notNull(),
    newCode: text("new_code").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    /** Rows rewritten and duplicates removed, per table: the journal. */
    appliedStats: jsonb("applied_stats"),
  },
  (table) => [
    uniqueIndex("rome_substitutions_unique_idx").on(
      table.entity,
      table.oldCode,
      table.newCode,
    ),
    check(
      "rome_substitutions_entity_check",
      sql`${table.entity} in ('metier', 'appellation', 'competence')`,
    ),
  ],
);

/** One row per sync; the running one doubles as the lock, as in `job_digest_runs`. */
export const romeSyncRuns = pgTable(
  "rome_sync_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: text("status").notNull().default("running"),
    stats: jsonb("stats"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("rome_sync_runs_running_idx")
      .on(table.status)
      .where(sql`${table.status} = 'running'`),
    index("rome_sync_runs_recent_idx").on(sql`${table.startedAt} desc`),
  ],
);

/**
 * The appellations attached to a search project (US-118). Keyed like
 * `search_projects`, by `(user_email, profile_id)`, and **without a foreign
 * key**: `PgProfilesStore.save` deletes and re-inserts every profile row, and a
 * code France Travail retires must be rewritten, not cascade-deleted.
 *
 * The labels are a snapshot, read only when the referential no longer knows
 * the code — a sync not run yet, or a code retired since.
 */
export const searchProjectRome = pgTable(
  "search_project_rome",
  {
    userEmail: text("user_email").notNull(),
    profileId: text("profile_id").notNull(),
    appellationCode: text("appellation_code").notNull(),
    libelle: text("libelle").notNull(),
    metierCode: text("metier_code").notNull(),
    metierLibelle: text("metier_libelle").notNull(),
    /** `suggested` by ROMEO, `confirmed` or `dismissed` by the candidate. */
    status: text("status").notNull(),
    score: real("score"),
    /** `romeo` or `manual` (picked from the autocomplete). */
    source: text("source").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.userEmail, table.profileId, table.appellationCode],
    }),
    check(
      "search_project_rome_status_check",
      sql`${table.status} in ('suggested', 'confirmed', 'dismissed')`,
    ),
    check(
      "search_project_rome_source_check",
      sql`${table.source} in ('romeo', 'manual')`,
    ),
  ],
);

/** The ROME competences ROMEO read in a candidate's CV (US-125). */
export const profileRomeCompetences = pgTable(
  "profile_rome_competences",
  {
    userEmail: text("user_email").notNull(),
    profileId: text("profile_id").notNull(),
    competenceCode: text("competence_code").notNull(),
    libelle: text("libelle").notNull(),
    type: text("type").notNull(),
    /** `inferred` by ROMEO, `dismissed` by the candidate — never inferred again. */
    status: text("status").notNull(),
    score: real("score").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.userEmail, table.profileId, table.competenceCode],
    }),
    check(
      "profile_rome_competences_status_check",
      sql`${table.status} in ('inferred', 'dismissed')`,
    ),
  ],
);

/** What ROMEO last read for a profile, so an unchanged CV is not sent again. */
export const profileRomeInferences = pgTable(
  "profile_rome_inferences",
  {
    userEmail: text("user_email").notNull(),
    profileId: text("profile_id").notNull(),
    fingerprint: text("fingerprint").notNull(),
    inferredAt: timestamp("inferred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userEmail, table.profileId] })],
);

import { count, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { createDatabaseClient } from "../database/database.client";
import { resolveDatabaseConfig } from "../database/database.config";
import {
  jobBoards,
  jobDigestRuns,
  jobListings,
  jobMatches,
  jobs,
  searchProjects,
} from "../database/schema";
import type { Database } from "../database/database.types";
import { resolveFranceTravailConfig } from "./sources/france-travail.config";
import { loadEnvironmentFiles } from "../shared/env";

/**
 * Says why the offer database looks the way it does.
 *
 *   pnpm --filter @cvforge/api job-digest:status
 *   node apps/api/dist/apps/api/src/job-search/job-digest-status.main.js
 *                                                (container: it has no tsx)
 *
 * "The collection already ran" and "the collection found something" are two
 * different statements: the day is claimed before any source is called, so a
 * run that collected nothing still holds the day. This reads what each run
 * actually did and what the tables hold, and changes nothing.
 */
async function main() {
  const envFile = loadEnvironmentFiles();

  const database = createDatabaseClient(resolveDatabaseConfig(process.env));

  try {
    const { db } = database;
    const rows: Array<[string, number]> = [
      ["recherches configurées", await total(db, searchProjects)],
      [
        "dont avec un poste visé",
        await total(
          db,
          searchProjects,
          sql`jsonb_array_length(${searchProjects.targetRoles}) > 0`,
        ),
      ],
      [
        "dont digest du matin activé",
        await total(db, searchProjects, eq(searchProjects.digestEnabled, true)),
      ],
      ["entreprises au registre", await total(db, jobBoards)],
      ["dont actives", await total(db, jobBoards, eq(jobBoards.enabled, true))],
      ["annonces collectées", await total(db, jobListings)],
      ["offres uniques", await total(db, jobs)],
      ["dont encore ouvertes", await total(db, jobs, isNull(jobs.closedAt))],
      ["offres proposées", await total(db, jobMatches)],
    ];

    console.log("État de la base d'offres");
    for (const [label, value] of rows) {
      console.log(`  ${String(value).padStart(7)}  ${label}`);
    }

    const runs = await db
      .select()
      .from(jobDigestRuns)
      .orderBy(desc(jobDigestRuns.runDate))
      .limit(7);

    console.log("\nDernières collectes");
    if (runs.length === 0) console.log("  aucune — elle n'a jamais tourné.");
    for (const run of runs) {
      console.log(`  ${run.runDate} — ${run.status}`);
      console.log(`    ${JSON.stringify(run.stats)}`);
    }

    // Named, never printed: which variables this process actually sees answers
    // "I did set them" — they may have been set on another service, or the
    // container may not have been recreated since.
    console.log(
      `\nEnvironnement : ${envFile ? `fichier ${envFile}` : "aucun fichier .env, variables fournies par le conteneur"}`,
    );
    for (const name of [
      "DATABASE_URL",
      "FRANCE_TRAVAIL_CLIENT_ID",
      "FRANCE_TRAVAIL_CLIENT_SECRET",
      "NEXT_PUBLIC_APP_URL",
    ]) {
      const value = process.env[name]?.trim();
      console.log(
        `  ${value ? "présent " : "⚠️ absent"}  ${name}${value ? ` (${value.length} caractères)` : ""}`,
      );
    }

    console.log(
      `France Travail : ${
        resolveFranceTravailConfig().enabled
          ? "la source est active"
          : "⚠️ inerte, elle ne sera pas appelée"
      }`,
    );

    // The collection asks the sources for what the candidates' searches name.
    // No search with a role to look for means no query at all, so no offer —
    // however well configured the sources are.
    const rolesConfigured = rows[1]?.[1] ?? 0;
    if (rolesConfigured === 0) {
      console.log(
        "⚠️ Aucune recherche ne vise de poste : la collecte n'a rien à demander.",
      );
    }
  } finally {
    await database.close();
  }
}

async function total(
  db: Database,
  table: PgTable,
  where?: SQL,
): Promise<number> {
  const query = db.select({ value: count() }).from(table);
  const [row] = await (where ? query.where(where) : query);

  return row?.value ?? 0;
}

void main();

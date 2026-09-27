import { and, eq, gt, inArray, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  profileRomeCompetences,
  romeCompetences,
  romeMetierCompetences,
} from "../database/schema";
import type { StoredJob } from "./jobs.types";
import type {
  RomeCompetenceRef,
  RomeScoringContext,
} from "./matching/rome-matching";

/** DI token for what the morning selection reads of ROME. */
export const ROME_MATCHING_READER = Symbol("ROME_MATCHING_READER");

/**
 * Past this many métiers, a competence says nothing about any one of them:
 * the soft skills ("Faire preuve d'autonomie", 509) and a few broad
 * know-hows ("Définir des besoins en approvisionnement", 139).
 */
const GENERIC_ABOVE_METIERS = 100;

export interface RomeMatchingRun {
  /** Everything scoring needs for one candidate and their pool of offers. */
  contextFor(input: {
    userEmail: string;
    profileId: string;
    projectCodes: readonly string[];
    jobs: readonly StoredJob[];
  }): Promise<RomeScoringContext>;
}

export interface RomeMatchingReader {
  /**
   * A reading for one morning run. The referential is read once per run and
   * shared by every candidate; the next run reads it again, after the weekly
   * sync may have changed it.
   */
  forRun(): RomeMatchingRun;
}

export class PgRomeMatchingReader implements RomeMatchingReader {
  constructor(private readonly db: Database) {}

  forRun(): RomeMatchingRun {
    let generic: Promise<Set<string>> | null = null;
    const metiers = new Map<string, RomeCompetenceRef[]>();

    return {
      contextFor: async ({ userEmail, profileId, projectCodes, jobs }) => {
        generic ??= this.genericCodes();
        const missing = [
          ...new Set(
            jobs.flatMap((job) => (job.romeCode ? [job.romeCode] : [])),
          ),
        ].filter((code) => !metiers.has(code));

        for (const [code, competences] of await this.metierCompetences(
          missing,
        )) {
          metiers.set(code, competences);
        }

        return {
          genericCodes: await generic,
          metierCompetences: metiers,
          profileCompetences: await this.profileCompetences(
            userEmail,
            profileId,
          ),
          projectCodes,
        };
      },
    };
  }

  private async genericCodes() {
    const rows = await this.db
      .select({ code: romeMetierCompetences.competenceCode })
      .from(romeMetierCompetences)
      .groupBy(romeMetierCompetences.competenceCode)
      .having(gt(sql`count(*)`, GENERIC_ABOVE_METIERS));

    return new Set(rows.map((row) => row.code));
  }

  /** Every listed métier gets an entry, empty if the referential lacks it. */
  private async metierCompetences(codes: string[]) {
    const byMetier = new Map<string, RomeCompetenceRef[]>(
      codes.map((code) => [code, []]),
    );
    if (codes.length === 0) return byMetier;

    const rows = await this.db
      .select({
        code: romeCompetences.code,
        label: romeCompetences.libelle,
        metierCode: romeMetierCompetences.metierCode,
      })
      .from(romeMetierCompetences)
      .innerJoin(
        romeCompetences,
        eq(romeCompetences.code, romeMetierCompetences.competenceCode),
      )
      .where(inArray(romeMetierCompetences.metierCode, codes));

    for (const row of rows) {
      byMetier.get(row.metierCode)?.push({ code: row.code, label: row.label });
    }

    return byMetier;
  }

  private profileCompetences(userEmail: string, profileId: string) {
    return this.db
      .select({
        code: profileRomeCompetences.competenceCode,
        label: sql<string>`coalesce(${romeCompetences.libelle}, ${profileRomeCompetences.libelle})`,
      })
      .from(profileRomeCompetences)
      .leftJoin(
        romeCompetences,
        eq(romeCompetences.code, profileRomeCompetences.competenceCode),
      )
      .where(
        and(
          eq(profileRomeCompetences.userEmail, userEmail),
          eq(profileRomeCompetences.profileId, profileId),
          eq(profileRomeCompetences.status, "inferred"),
        ),
      );
  }
}

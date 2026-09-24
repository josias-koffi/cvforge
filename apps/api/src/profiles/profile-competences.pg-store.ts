import type { ProfileRomeCompetence } from "@cvforge/types";
import { and, desc, eq, notInArray, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  profileRomeCompetences,
  profileRomeInferences,
  romeCompetences,
} from "../database/schema";

/** DI token for the competences ROMEO read in the candidates' CVs. */
export const PROFILE_COMPETENCES_STORE = Symbol("PROFILE_COMPETENCES_STORE");

export interface ProfileCompetencesStore {
  /** The inferred competences, the most confident first; removed ones never. */
  list(userEmail: string, profileId: string): Promise<ProfileRomeCompetence[]>;
  /** The fingerprint of the texts ROMEO last read, `null` if never. */
  fingerprint(userEmail: string, profileId: string): Promise<string | null>;
  dismissedCodes(userEmail: string, profileId: string): Promise<Set<string>>;
  /** Replaces the inferred competences and records what they were read from. */
  replaceInferred(
    userEmail: string,
    profileId: string,
    fingerprint: string,
    competences: readonly ProfileRomeCompetence[],
  ): Promise<void>;
  /** Kept as `dismissed`, so a later reading never infers it again. */
  dismiss(userEmail: string, profileId: string, code: string): Promise<boolean>;
  /** Drops what belonged to profiles the registry no longer has. */
  forgetOtherProfiles(userEmail: string, profileIds: string[]): Promise<void>;
}

export class PgProfileCompetencesStore implements ProfileCompetencesStore {
  constructor(private readonly db: Database) {}

  /**
   * The referential's current label when it still knows the code, the
   * snapshot otherwise — a code retired since, or a referential not synced.
   */
  async list(userEmail: string, profileId: string) {
    return this.db
      .select({
        code: profileRomeCompetences.competenceCode,
        libelle: sql<string>`coalesce(${romeCompetences.libelle}, ${profileRomeCompetences.libelle})`,
        score: profileRomeCompetences.score,
        type: sql<string>`coalesce(${romeCompetences.type}, ${profileRomeCompetences.type})`,
      })
      .from(profileRomeCompetences)
      .leftJoin(
        romeCompetences,
        eq(romeCompetences.code, profileRomeCompetences.competenceCode),
      )
      .where(
        and(
          owner(profileRomeCompetences, userEmail, profileId),
          eq(profileRomeCompetences.status, "inferred"),
        ),
      )
      .orderBy(
        desc(profileRomeCompetences.score),
        profileRomeCompetences.libelle,
      );
  }

  async fingerprint(userEmail: string, profileId: string) {
    const [row] = await this.db
      .select({ fingerprint: profileRomeInferences.fingerprint })
      .from(profileRomeInferences)
      .where(owner(profileRomeInferences, userEmail, profileId));

    return row?.fingerprint ?? null;
  }

  async dismissedCodes(userEmail: string, profileId: string) {
    const rows = await this.db
      .select({ code: profileRomeCompetences.competenceCode })
      .from(profileRomeCompetences)
      .where(
        and(
          owner(profileRomeCompetences, userEmail, profileId),
          eq(profileRomeCompetences.status, "dismissed"),
        ),
      );

    return new Set(rows.map((row) => row.code));
  }

  async replaceInferred(
    userEmail: string,
    profileId: string,
    fingerprint: string,
    competences: readonly ProfileRomeCompetence[],
  ) {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(profileRomeCompetences)
        .where(
          and(
            owner(profileRomeCompetences, userEmail, profileId),
            eq(profileRomeCompetences.status, "inferred"),
          ),
        );

      if (competences.length > 0) {
        // A removal made meanwhile wins over a fresh inference.
        await tx
          .insert(profileRomeCompetences)
          .values(
            competences.map((competence) => ({
              competenceCode: competence.code,
              libelle: competence.libelle,
              profileId,
              score: competence.score,
              status: "inferred",
              type: competence.type,
              userEmail,
            })),
          )
          .onConflictDoNothing();
      }

      const inference = { fingerprint, inferredAt: new Date() };
      await tx
        .insert(profileRomeInferences)
        .values({ ...inference, profileId, userEmail })
        .onConflictDoUpdate({
          set: inference,
          target: [
            profileRomeInferences.userEmail,
            profileRomeInferences.profileId,
          ],
        });
    });
  }

  async dismiss(userEmail: string, profileId: string, code: string) {
    const rows = await this.db
      .update(profileRomeCompetences)
      .set({ status: "dismissed", updatedAt: new Date() })
      .where(
        and(
          owner(profileRomeCompetences, userEmail, profileId),
          eq(profileRomeCompetences.competenceCode, code),
        ),
      )
      .returning({ code: profileRomeCompetences.competenceCode });

    return rows.length > 0;
  }

  async forgetOtherProfiles(userEmail: string, profileIds: string[]) {
    await this.db.transaction(async (tx) => {
      for (const table of [profileRomeCompetences, profileRomeInferences]) {
        await tx
          .delete(table)
          .where(
            and(
              eq(table.userEmail, userEmail),
              profileIds.length > 0
                ? notInArray(table.profileId, profileIds)
                : undefined,
            ),
          );
      }
    });
  }
}

function owner(
  table: typeof profileRomeCompetences | typeof profileRomeInferences,
  userEmail: string,
  profileId: string,
) {
  return and(eq(table.userEmail, userEmail), eq(table.profileId, profileId));
}

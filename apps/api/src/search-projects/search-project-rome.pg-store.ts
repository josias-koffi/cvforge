import type {
  RomeAppellationOption,
  SearchProjectRomeAppellation,
  SearchProjectRomeStatus,
} from "@cvforge/types";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  romeAppellations,
  romeMetiers,
  searchProjectRome,
} from "../database/schema";

/** DI token for the appellations attached to search projects. */
export const SEARCH_PROJECT_ROME_STORE = Symbol("SEARCH_PROJECT_ROME_STORE");

export interface ScoredAppellation extends RomeAppellationOption {
  score: number;
}

export interface SearchProjectRomeStore {
  /** Confirmed first, then suggestions by score; dismissed ones are not returned. */
  list(
    userEmail: string,
    profileId: string,
  ): Promise<SearchProjectRomeAppellation[]>;
  /** Every code the candidate already decided on: confirmed or dismissed. */
  decidedCodes(userEmail: string, profileId: string): Promise<Set<string>>;
  /** Replaces the pending suggestions; decisions are left untouched. */
  replaceSuggestions(
    userEmail: string,
    profileId: string,
    suggestions: readonly ScoredAppellation[],
  ): Promise<void>;
  /** The appellation is confirmed, whether it was suggested, dismissed or new. */
  confirm(
    userEmail: string,
    profileId: string,
    appellation: RomeAppellationOption,
  ): Promise<void>;
  /** Kept as `dismissed`, so a later save never suggests it again. */
  dismiss(userEmail: string, profileId: string, code: string): Promise<boolean>;
  findOne(
    userEmail: string,
    profileId: string,
    code: string,
  ): Promise<SearchProjectRomeAppellation | null>;
}

const VISIBLE_STATUSES: SearchProjectRomeStatus[] = ["confirmed", "suggested"];

export class PgSearchProjectRomeStore implements SearchProjectRomeStore {
  constructor(private readonly db: Database) {}

  async list(userEmail: string, profileId: string) {
    return this.select(userEmail, profileId).orderBy(
      sql`${searchProjectRome.status} = 'confirmed' desc`,
      sql`${searchProjectRome.score} desc nulls last`,
      searchProjectRome.libelle,
    );
  }

  async findOne(userEmail: string, profileId: string, code: string) {
    const [row] = await this.select(userEmail, profileId, code).limit(1);

    return row ?? null;
  }

  async decidedCodes(userEmail: string, profileId: string) {
    const rows = await this.db
      .select({ code: searchProjectRome.appellationCode })
      .from(searchProjectRome)
      .where(
        and(
          this.owner(userEmail, profileId),
          inArray(searchProjectRome.status, ["confirmed", "dismissed"]),
        ),
      );

    return new Set(rows.map((row) => row.code));
  }

  async replaceSuggestions(
    userEmail: string,
    profileId: string,
    suggestions: readonly ScoredAppellation[],
  ) {
    await this.db.transaction(async (tx) => {
      await tx
        .delete(searchProjectRome)
        .where(
          and(
            this.owner(userEmail, profileId),
            eq(searchProjectRome.status, "suggested"),
          ),
        );

      if (suggestions.length === 0) return;

      // A decision taken meanwhile wins over a fresh suggestion.
      await tx
        .insert(searchProjectRome)
        .values(
          suggestions.map((suggestion) => ({
            ...snapshot(userEmail, profileId, suggestion),
            score: suggestion.score,
            source: "romeo",
            status: "suggested",
          })),
        )
        .onConflictDoNothing();
    });
  }

  async confirm(
    userEmail: string,
    profileId: string,
    appellation: RomeAppellationOption,
  ) {
    await this.db
      .insert(searchProjectRome)
      .values({
        ...snapshot(userEmail, profileId, appellation),
        score: null,
        source: "manual",
        status: "confirmed",
      })
      // A suggestion keeps its score and its ROMEO origin once confirmed.
      .onConflictDoUpdate({
        set: { status: "confirmed", updatedAt: new Date() },
        target: [
          searchProjectRome.userEmail,
          searchProjectRome.profileId,
          searchProjectRome.appellationCode,
        ],
      });
  }

  async dismiss(userEmail: string, profileId: string, code: string) {
    const rows = await this.db
      .update(searchProjectRome)
      .set({ status: "dismissed", updatedAt: new Date() })
      .where(
        and(
          this.owner(userEmail, profileId),
          eq(searchProjectRome.appellationCode, code),
        ),
      )
      .returning({ code: searchProjectRome.appellationCode });

    return rows.length > 0;
  }

  /**
   * The referential's current labels when it still knows the code, the
   * snapshot otherwise — a code retired since, or a referential not synced yet.
   */
  private select(userEmail: string, profileId: string, code?: string) {
    return this.db
      .select({
        code: searchProjectRome.appellationCode,
        libelle: sql<string>`coalesce(${romeAppellations.libelle}, ${searchProjectRome.libelle})`,
        metierCode: sql<string>`coalesce(${romeMetiers.code}, ${searchProjectRome.metierCode})`,
        metierLibelle: sql<string>`coalesce(${romeMetiers.libelle}, ${searchProjectRome.metierLibelle})`,
        score: searchProjectRome.score,
        status: sql<SearchProjectRomeStatus>`${searchProjectRome.status}`,
      })
      .from(searchProjectRome)
      .leftJoin(
        romeAppellations,
        eq(romeAppellations.code, searchProjectRome.appellationCode),
      )
      .leftJoin(romeMetiers, eq(romeMetiers.code, romeAppellations.metierCode))
      .where(
        and(
          this.owner(userEmail, profileId),
          inArray(searchProjectRome.status, VISIBLE_STATUSES),
          code ? eq(searchProjectRome.appellationCode, code) : undefined,
        ),
      )
      .$dynamic();
  }

  private owner(userEmail: string, profileId: string) {
    return and(
      eq(searchProjectRome.userEmail, userEmail),
      eq(searchProjectRome.profileId, profileId),
    );
  }
}

function snapshot(
  userEmail: string,
  profileId: string,
  appellation: RomeAppellationOption,
) {
  return {
    appellationCode: appellation.code,
    libelle: appellation.libelle,
    metierCode: appellation.metierCode,
    metierLibelle: appellation.metierLibelle,
    profileId,
    updatedAt: new Date(),
    userEmail,
  };
}

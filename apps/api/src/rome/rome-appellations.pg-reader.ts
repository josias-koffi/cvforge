import type { RomeAppellationOption } from "@cvforge/types";
import { asc, eq, like, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { romeAppellations, romeMetiers } from "../database/schema";
import { normalizeForSearch } from "./rome-referential";

export const ROME_APPELLATIONS = Symbol("ROME_APPELLATIONS");

export interface RomeAppellationsReader {
  /** Appellations whose label contains the query, those starting with it first. */
  search(query: string, limit: number): Promise<RomeAppellationOption[]>;
  find(code: string): Promise<RomeAppellationOption | null>;
}

const MIN_QUERY_CHARS = 2;

/** Reads the local ROME copy: the autocomplete never calls France Travail. */
export class PgRomeAppellationsReader implements RomeAppellationsReader {
  constructor(private readonly db: Database) {}

  async search(query: string, limit: number): Promise<RomeAppellationOption[]> {
    const term = normalizeForSearch(query);
    if (term.length < MIN_QUERY_CHARS) return [];

    const pattern = escapeLike(term);

    return this.select()
      .where(like(romeAppellations.libelleSearch, `%${pattern}%`))
      .orderBy(
        sql`${romeAppellations.libelleSearch} like ${`${pattern}%`} desc`,
        sql`length(${romeAppellations.libelle})`,
        asc(romeAppellations.libelle),
      )
      .limit(limit);
  }

  async find(code: string): Promise<RomeAppellationOption | null> {
    const [row] = await this.select()
      .where(eq(romeAppellations.code, code))
      .limit(1);

    return row ?? null;
  }

  private select() {
    return this.db
      .select({
        code: romeAppellations.code,
        libelle: romeAppellations.libelle,
        metierCode: romeMetiers.code,
        metierLibelle: romeMetiers.libelle,
      })
      .from(romeAppellations)
      .innerJoin(romeMetiers, eq(romeMetiers.code, romeAppellations.metierCode))
      .$dynamic();
  }
}

/** A typed `%` or `_` is a character to find, not a wildcard. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

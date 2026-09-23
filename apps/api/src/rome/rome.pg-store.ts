import { and, count, desc, eq, isNull, lt, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import {
  romeAppellations,
  romeCompetences,
  romeMetierCompetences,
  romeMetiers,
  romeSubstitutions,
  romeSyncRuns,
} from "../database/schema";
import type {
  RomeCodeHolder,
  RomeCounts,
  RomeEntity,
  RomeHolderOutcome,
  RomeReferential,
  RomeStore,
  RomeSubstitution,
  RomeSyncRun,
  RomeSyncStatus,
} from "./rome.types";

/** Keeps each insert well under Postgres's 65 535 bound parameters. */
const INSERT_CHUNK = 2_000;
const SQL_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

type RunRow = typeof romeSyncRuns.$inferSelect;

export class PgRomeStore implements RomeStore {
  constructor(private readonly db: Database) {}

  /** Two instances may both try: the partial unique index lets one through. */
  async claimRun(): Promise<RomeSyncRun | null> {
    const [row] = await this.db
      .insert(romeSyncRuns)
      .values({ status: "running" })
      .onConflictDoNothing()
      .returning();

    return row ? toRun(row) : null;
  }

  /** A sync whose process died would otherwise hold the lock for ever. */
  async recoverStale(olderThanMs: number): Promise<number> {
    const rows = await this.db
      .update(romeSyncRuns)
      .set({ finishedAt: new Date(), status: "failed" })
      .where(
        and(
          eq(romeSyncRuns.status, "running"),
          lt(romeSyncRuns.startedAt, new Date(Date.now() - olderThanMs)),
        ),
      )
      .returning({ id: romeSyncRuns.id });

    return rows.length;
  }

  async finishRun(
    runId: string,
    outcome: { status: "done" | "failed"; stats: Record<string, unknown> },
  ): Promise<void> {
    await this.db
      .update(romeSyncRuns)
      .set({
        finishedAt: new Date(),
        stats: outcome.stats,
        status: outcome.status,
      })
      .where(eq(romeSyncRuns.id, runId));
  }

  async lastRun(status?: "done"): Promise<RomeSyncRun | null> {
    const [row] = await this.db
      .select()
      .from(romeSyncRuns)
      .where(status ? eq(romeSyncRuns.status, status) : undefined)
      .orderBy(desc(romeSyncRuns.startedAt))
      .limit(1);

    return row ? toRun(row) : null;
  }

  async counts(): Promise<RomeCounts> {
    const [metiers, appellations, competences, links] = await Promise.all([
      this.db.select({ value: count() }).from(romeMetiers),
      this.db.select({ value: count() }).from(romeAppellations),
      this.db.select({ value: count() }).from(romeCompetences),
      this.db.select({ value: count() }).from(romeMetierCompetences),
    ]);

    return {
      appellations: appellations[0]?.value ?? 0,
      competences: competences[0]?.value ?? 0,
      links: links[0]?.value ?? 0,
      metiers: metiers[0]?.value ?? 0,
    };
  }

  async codes(entity: RomeEntity): Promise<Set<string>> {
    const table = {
      appellation: romeAppellations,
      competence: romeCompetences,
      metier: romeMetiers,
    }[entity];
    const rows = await this.db.select({ code: table.code }).from(table);

    return new Set(rows.map((row) => row.code));
  }

  /**
   * Children first on the way out, parents first on the way in, all in one
   * transaction: a failure anywhere rolls back to the previous referential.
   */
  async replace(referential: RomeReferential): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(romeMetierCompetences);
      await tx.delete(romeAppellations);
      await tx.delete(romeMetiers);
      await tx.delete(romeCompetences);

      for (const rows of chunks(referential.metiers)) {
        await tx.insert(romeMetiers).values(rows);
      }
      for (const rows of chunks(referential.competences)) {
        await tx.insert(romeCompetences).values(rows);
      }
      for (const rows of chunks(referential.appellations)) {
        await tx.insert(romeAppellations).values(rows);
      }
      for (const rows of chunks(referential.links)) {
        await tx.insert(romeMetierCompetences).values(rows);
      }
    });
  }

  async recordSubstitutions(
    substitutions: Array<Omit<RomeSubstitution, "id">>,
  ): Promise<number> {
    // A code replaced by itself would rewrite nothing and stay pending for ever.
    const meaningful = substitutions.filter(
      (entry) => entry.oldCode !== entry.newCode,
    );
    if (meaningful.length === 0) return 0;

    const rows = await this.db
      .insert(romeSubstitutions)
      .values(meaningful)
      .onConflictDoNothing()
      .returning({ id: romeSubstitutions.id });

    return rows.length;
  }

  async pendingSubstitutions(): Promise<RomeSubstitution[]> {
    const rows = await this.db
      .select()
      .from(romeSubstitutions)
      .where(isNull(romeSubstitutions.appliedAt))
      .orderBy(romeSubstitutions.recordedAt);

    return rows.map((row) => ({
      entity: row.entity as RomeEntity,
      id: row.id,
      newCode: row.newCode,
      oldCode: row.oldCode,
    }));
  }

  /**
   * Per holder: rewrite the rows whose new code is not already there, then
   * delete what is left under the old code — those rows would have become
   * duplicates of one the user already had. Stamped in the same transaction,
   * so a replay finds nothing to do.
   */
  async applySubstitution(
    substitution: RomeSubstitution,
    holders: readonly RomeCodeHolder[],
  ): Promise<Record<string, RomeHolderOutcome>> {
    const concerned = holders.filter(
      (holder) => holder.entity === substitution.entity,
    );

    return this.db.transaction(async (tx) => {
      const outcome: Record<string, RomeHolderOutcome> = {};

      for (const holder of concerned) {
        const { table, column, sameScope } = identifiers(holder);

        const rewritten = await tx.execute(sql`
          update ${table} as target set ${column} = ${substitution.newCode}
          where target.${column} = ${substitution.oldCode}
            and not exists (
              select 1 from ${table} as other
              where other.${column} = ${substitution.newCode} ${sameScope}
            )`);
        const removed = await tx.execute(
          sql`delete from ${table} where ${column} = ${substitution.oldCode}`,
        );

        outcome[holder.table] = {
          duplicatesRemoved: affected(removed),
          rewritten: affected(rewritten),
        };
      }

      await tx
        .update(romeSubstitutions)
        .set({ appliedAt: new Date(), appliedStats: outcome })
        .where(eq(romeSubstitutions.id, substitution.id));

      return outcome;
    });
  }
}

/**
 * Holders are declared in code, never by a user — the check is still made,
 * because these names are spliced into SQL rather than bound.
 */
function identifiers(holder: RomeCodeHolder) {
  for (const name of [holder.table, holder.column, ...holder.scope]) {
    if (!SQL_IDENTIFIER.test(name)) {
      throw new Error(`Invalid SQL identifier: ${name}`);
    }
  }

  const sameScope = sql.join(
    holder.scope.map((column) =>
      sql.raw(`and other.${column} = target.${column}`),
    ),
    sql` `,
  );

  return {
    column: sql.raw(holder.column),
    sameScope,
    table: sql.raw(holder.table),
  };
}

/** node-postgres reports `rowCount`, PGlite `affectedRows`. */
function affected(result: unknown): number {
  const { affectedRows, rowCount } = result as {
    affectedRows?: number;
    rowCount?: number;
  };

  return rowCount ?? affectedRows ?? 0;
}

function chunks<T>(rows: readonly T[]): T[][] {
  const out: T[][] = [];

  for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
    out.push(rows.slice(start, start + INSERT_CHUNK));
  }

  return out;
}

function toRun(row: RunRow): RomeSyncRun {
  return {
    finishedAt: row.finishedAt,
    id: row.id,
    startedAt: row.startedAt,
    stats: (row.stats as Record<string, unknown> | null) ?? null,
    status: row.status as RomeSyncStatus,
  };
}

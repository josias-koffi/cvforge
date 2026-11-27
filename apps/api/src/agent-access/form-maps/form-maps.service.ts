import { sql } from "drizzle-orm";
import type { Database } from "../../database/database.types";
import { formFillOutcomes, formMapVotes } from "../../database/schema";

/** Two different candidates must have confirmed a rule before it is served. */
export const FORM_MAP_MIN_USERS = 2;
/** A rule missed by this many candidates is withdrawn, whatever its successes. */
export const FORM_MAP_MAX_MISSES = 3;

export type FormMapRule = { signature: string; fieldKey: string };

export type FormMapReport = {
  site: string;
  /** Fields that held the candidate's data after the fill. */
  confirmed: FormMapRule[];
  /** Rules served for this form whose field did not keep that data. */
  missed: FormMapRule[];
  aiUsed: boolean;
};

/** DI token for the form map store. */
export const FORM_MAP_STORE = Symbol("FORM_MAP_STORE");

export type FormMapStore = {
  rules(site: string): Promise<FormMapRule[]>;
  vote(userEmail: string, report: FormMapReport): Promise<void>;
};

export class PgFormMapStore implements FormMapStore {
  constructor(private readonly db: Database) {}

  async rules(site: string): Promise<FormMapRule[]> {
    const oks = sql<number>`count(*) filter (where ${formMapVotes.ok})`;
    const misses = sql<number>`count(*) filter (where not ${formMapVotes.ok})`;
    const rows = await this.db
      .select({
        fieldKey: formMapVotes.fieldKey,
        misses: misses.mapWith(Number),
        oks: oks.mapWith(Number),
        signature: formMapVotes.signature,
      })
      .from(formMapVotes)
      .where(sql`${formMapVotes.site} = ${site}`)
      .groupBy(formMapVotes.signature, formMapVotes.fieldKey);
    return servedRules(rows);
  }

  async vote(userEmail: string, report: FormMapReport) {
    const votes = [
      ...report.confirmed.map((rule) => ({ ...rule, ok: true })),
      ...report.missed.map((rule) => ({ ...rule, ok: false })),
    ].map((vote) => ({ ...vote, site: report.site, userEmail }));
    await this.db.transaction(async (tx) => {
      if (votes.length > 0) {
        await tx
          .insert(formMapVotes)
          .values(votes)
          .onConflictDoUpdate({
            set: { ok: sql`excluded.ok`, updatedAt: sql`now()` },
            target: [
              formMapVotes.site,
              formMapVotes.signature,
              formMapVotes.fieldKey,
              formMapVotes.userEmail,
            ],
          });
      }
      await tx
        .insert(formFillOutcomes)
        .values({ aiUsed: report.aiUsed, site: report.site });
    });
  }
}

/**
 * The rules worth serving: confirmed by two candidates at least, missed by
 * fewer than they succeeded and fewer than three, one data per field.
 */
export function servedRules(
  rows: { signature: string; fieldKey: string; oks: number; misses: number }[],
): FormMapRule[] {
  const good = rows.filter(
    (row) =>
      row.oks >= FORM_MAP_MIN_USERS &&
      row.misses < row.oks &&
      row.misses < FORM_MAP_MAX_MISSES,
  );
  const bySignature = new Map<string, typeof good>();
  for (const row of good) {
    bySignature.set(row.signature, [
      ...(bySignature.get(row.signature) ?? []),
      row,
    ]);
  }
  return [...bySignature.values()].flatMap((candidates) => {
    const [best, second] = [...candidates].sort((a, b) => b.oks - a.oks);
    // Two data tied for one field: unsure, so nothing.
    if (!best || (second && second.oks === best.oks)) return [];
    return [{ fieldKey: best.fieldKey, signature: best.signature }];
  });
}

/** The learned map of application forms (US-205). */
export class FormMapsService {
  constructor(private readonly store: FormMapStore) {}

  rules(site: string) {
    return this.store.rules(site.toLowerCase());
  }

  report(userEmail: string, report: FormMapReport) {
    return this.store.vote(userEmail, {
      ...report,
      site: report.site.toLowerCase(),
    });
  }
}

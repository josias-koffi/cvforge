import { and, count, eq, gte, isNull, lte } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Database } from "../database/database.types";
import { atsScans } from "../database/schema";
import type { AtsScanStore, NewAtsScan, StoredAtsScan } from "./ats.types";

type AtsScanRow = typeof atsScans.$inferSelect;

function toScan(row: AtsScanRow): StoredAtsScan {
  return {
    createdAt: row.createdAt.toISOString(),
    email: row.email,
    engineVersion: row.engineVersion,
    expiresAt: row.expiresAt.toISOString(),
    id: row.id,
    ipHash: row.ipHash,
    locale: row.locale,
    overallScore: row.overallScore,
    result: row.result,
    source: row.source,
    unlockedAt: row.unlockedAt?.toISOString() ?? null,
  };
}

export class PgAtsScanStore implements AtsScanStore {
  constructor(private readonly db: Database) {}

  async create(scan: NewAtsScan) {
    const [row] = await this.db
      .insert(atsScans)
      .values({
        engineVersion: scan.result.engineVersion,
        expiresAt: new Date(scan.expiresAt),
        id: randomUUID(),
        ipHash: scan.ipHash,
        locale: scan.locale,
        overallScore: scan.result.overallScore,
        result: scan.result,
        source: scan.source,
      })
      .returning();

    return toScan(row!);
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(atsScans)
      .where(eq(atsScans.id, id))
      .limit(1);

    return row ? toScan(row) : null;
  }

  async countSince(since: string) {
    const [row] = await this.db
      .select({ total: count() })
      .from(atsScans)
      .where(gte(atsScans.createdAt, new Date(since)));

    return row?.total ?? 0;
  }

  /**
   * Only the first unlock writes: `unlocked_at is null` in the predicate makes
   * a replayed request a no-op rather than a way to overwrite the address a
   * report was released to.
   */
  async unlock(id: string, email: string, at: string) {
    const [row] = await this.db
      .update(atsScans)
      .set({ email, unlockedAt: new Date(at) })
      .where(and(eq(atsScans.id, id), isNull(atsScans.unlockedAt)))
      .returning();

    return row ? toScan(row) : null;
  }

  async deleteExpired(now: string) {
    const rows = await this.db
      .delete(atsScans)
      .where(lte(atsScans.expiresAt, new Date(now)))
      .returning({ id: atsScans.id });

    return rows.length;
  }
}

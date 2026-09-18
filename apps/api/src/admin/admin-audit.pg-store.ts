import type { AdminAuditAction, AdminAuditEntry } from "@cvforge/types";
import { and, count, desc, eq, type SQL } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { adminAuditLog } from "../database/schema";
import type { AdminAuditDraft, AdminAuditStore } from "./admin-audit.types";

export const SCRUBBED_TARGET_MARKER = "[deleted-account]";

type AuditRow = typeof adminAuditLog.$inferSelect;

function toEntry(row: AuditRow): AdminAuditEntry {
  return {
    action: row.action,
    actorEmail: row.actorEmail,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    metadata: row.metadata,
    note: row.note,
    targetEmail: row.targetEmail,
  };
}

export class PgAdminAuditStore implements AdminAuditStore {
  constructor(private readonly db: Database) {}

  async record(draft: AdminAuditDraft) {
    const [row] = await this.db
      .insert(adminAuditLog)
      .values({
        action: draft.action,
        actorEmail: draft.actorEmail,
        metadata: draft.metadata,
        note: draft.note,
        targetEmail: draft.targetEmail,
      })
      .returning();

    return toEntry(row as AuditRow);
  }

  async list(query: {
    action?: string;
    limit: number;
    offset: number;
    targetEmail?: string;
  }) {
    const filters: SQL[] = [];

    if (query.targetEmail) {
      filters.push(eq(adminAuditLog.targetEmail, query.targetEmail));
    }

    if (query.action) {
      filters.push(eq(adminAuditLog.action, query.action as AdminAuditAction));
    }

    const where = filters.length > 0 ? and(...filters) : undefined;
    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(adminAuditLog)
        .where(where)
        .orderBy(desc(adminAuditLog.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ total: count() }).from(adminAuditLog).where(where),
    ]);

    return {
      entries: rows.map(toEntry),
      totalItems: Number(totals[0]?.total ?? 0),
    };
  }

  async scrubTarget(targetEmail: string) {
    const rows = await this.db
      .update(adminAuditLog)
      .set({ targetEmail: SCRUBBED_TARGET_MARKER })
      .where(eq(adminAuditLog.targetEmail, targetEmail))
      .returning({ id: adminAuditLog.id });

    return rows.length;
  }
}

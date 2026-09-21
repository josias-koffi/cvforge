import type {
  AdminLegalDocument,
  LegalDocumentInput,
  LegalDocumentSlug,
} from "@cvforge/types";
import { asc, eq, sql } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { legalDocuments } from "../database/schema";
import type { LegalDocumentsStore } from "./legal.types";

type LegalRow = typeof legalDocuments.$inferSelect;

function toDocument(row: LegalRow): AdminLegalDocument {
  return {
    body: row.body,
    id: row.id,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    slug: row.slug,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

export class PgLegalDocumentsStore implements LegalDocumentsStore {
  constructor(private readonly db: Database) {}

  async listAll() {
    const rows = await this.db
      .select()
      .from(legalDocuments)
      .orderBy(asc(legalDocuments.slug));

    return rows.map(toDocument);
  }

  async findBySlug(slug: LegalDocumentSlug) {
    const [row] = await this.db
      .select()
      .from(legalDocuments)
      .where(eq(legalDocuments.slug, slug))
      .limit(1);

    return row ? toDocument(row) : null;
  }

  async update(slug: LegalDocumentSlug, input: LegalDocumentInput) {
    const [row] = await this.db
      .update(legalDocuments)
      .set({ body: input.body, title: input.title, updatedAt: new Date() })
      .where(eq(legalDocuments.slug, slug))
      .returning();

    return row ? toDocument(row) : null;
  }

  async publish(slug: LegalDocumentSlug) {
    const now = new Date();
    const [row] = await this.db
      .update(legalDocuments)
      .set({
        publishedAt: now,
        updatedAt: now,
        version: sql`${legalDocuments.version} + 1`,
      })
      .where(eq(legalDocuments.slug, slug))
      .returning();

    return row ? toDocument(row) : null;
  }
}

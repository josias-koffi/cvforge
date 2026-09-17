import { asc, desc, eq } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { templates } from "../database/schema";
import type { StoredTemplate, TemplatesStore } from "./templates.types";

type TemplateRow = typeof templates.$inferSelect;

function toTemplate(row: TemplateRow): StoredTemplate {
  return {
    active: row.active,
    categories: row.categories,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    isDefault: row.isDefault,
    kind: row.kind,
    layout: row.layout,
    locale: row.locale,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toRow(template: StoredTemplate) {
  return {
    active: template.active,
    categories: template.categories,
    createdAt: new Date(template.createdAt),
    id: template.id,
    isDefault: template.isDefault,
    kind: template.kind,
    layout: template.layout,
    locale: template.locale,
    name: template.name,
    updatedAt: new Date(template.updatedAt),
  };
}

export class PgTemplatesStore implements TemplatesStore {
  constructor(private readonly db: Database) {}

  async create(template: StoredTemplate) {
    await this.db.insert(templates).values(toRow(template));

    return template;
  }

  async findById(templateId: string) {
    const [row] = await this.db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId));

    return row ? toTemplate(row) : null;
  }

  /** Grouped by kind, the default first, then most recently updated. */
  async list() {
    const rows = await this.db
      .select()
      .from(templates)
      .orderBy(
        asc(templates.kind),
        desc(templates.isDefault),
        desc(templates.updatedAt),
      );

    return rows.map(toTemplate);
  }

  async remove(templateId: string) {
    await this.db.delete(templates).where(eq(templates.id, templateId));
  }

  async save(template: StoredTemplate) {
    const row = toRow(template);

    await this.db
      .insert(templates)
      .values(row)
      .onConflictDoUpdate({ target: templates.id, set: row });

    return template;
  }
}

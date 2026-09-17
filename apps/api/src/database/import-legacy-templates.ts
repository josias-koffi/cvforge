import type { TemplateKind, TemplateRecord } from "@cvforge/types";
import { and, eq } from "drizzle-orm";
import { existsSync, readFileSync } from "node:fs";
import type { Database } from "./database.types";
import { dataImports, templates } from "./schema";

export const LEGACY_TEMPLATES_IMPORT = "templates-state.json";

export type LegacyTemplatesImportResult =
  | { status: "already_imported" }
  | { status: "imported"; templates: number };

function readLegacyTemplates(filePath: string): TemplateRecord[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
    templates?: Record<string, TemplateRecord>;
  };

  return Object.values(parsed.templates ?? {});
}

/**
 * Copies the JSON templates into Postgres once per environment.
 *
 * The seed migration has already inserted the two ATS templates and flagged
 * them default, but on an environment that has been running, the file is the
 * truth — an admin may have made another template the default. So every
 * legacy row is written with the flag cleared, then the default each kind
 * actually had is set last. `templates_single_default_per_kind_idx` allows
 * only one per kind and would reject any overlap in between.
 *
 * A missing file is recorded as imported too: there is nothing left to copy.
 */
export async function importLegacyTemplates(
  db: Database,
  filePath: string,
): Promise<LegacyTemplatesImportResult> {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .insert(dataImports)
      .values({ name: LEGACY_TEMPLATES_IMPORT })
      .onConflictDoNothing()
      .returning({ name: dataImports.name });

    if (claimed.length === 0) {
      return { status: "already_imported" };
    }

    const legacy = readLegacyTemplates(filePath).sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );

    for (const template of legacy) {
      const row = {
        active: template.active,
        categories: template.categories ?? [],
        createdAt: new Date(template.createdAt),
        id: template.id,
        isDefault: false,
        kind: template.kind,
        layout: template.layout,
        locale: template.locale,
        name: template.name,
        updatedAt: new Date(template.updatedAt),
      };

      await tx
        .insert(templates)
        .values(row)
        .onConflictDoUpdate({ target: templates.id, set: row });
    }

    const defaultsByKind = new Map<TemplateKind, string>();

    legacy
      .filter(({ isDefault }) => isDefault)
      .forEach((template) => {
        if (!defaultsByKind.has(template.kind)) {
          defaultsByKind.set(template.kind, template.id);
        }
      });

    for (const [kind, templateId] of defaultsByKind) {
      await tx
        .update(templates)
        .set({ isDefault: false })
        .where(and(eq(templates.kind, kind), eq(templates.isDefault, true)));

      await tx
        .update(templates)
        .set({ isDefault: true })
        .where(eq(templates.id, templateId));
    }

    return { status: "imported", templates: legacy.length };
  });
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  TEMPLATE_KIND_CV,
  TEMPLATE_KIND_LETTER,
  type TemplateLayoutData,
  type TemplateAnalyticsSummary,
  type TemplateUsageMetric,
} from "@cvforge/types";
import { randomUUID } from "node:crypto";
import type {
  StoredTemplate,
  TemplateExportRow,
  TemplatesAnalyticsPayload,
  TemplatesAnalyticsStore,
  TemplatesStore,
  TemplateInput,
} from "./templates.types";
import { toCsv } from "../shared/csv";

function normalizeTemplateKind(value: unknown) {
  return value === TEMPLATE_KIND_LETTER ? TEMPLATE_KIND_LETTER : TEMPLATE_KIND_CV;
}

function normalizeLocale(value: unknown) {
  return value === "en" ? "en" : "fr";
}

function normalizeCategories(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry).trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 10);
}

function normalizeLayout(value: unknown): TemplateLayoutData {
  if (!value || typeof value !== "object") {
    throw new BadRequestException("Le template doit contenir un layout JSON.");
  }

  const candidate = value as Record<string, unknown>;
  const content = candidate.content;

  if (!Array.isArray(content)) {
    throw new BadRequestException(
      "Le layout du template doit contenir un tableau 'content'.",
    );
  }

  const root =
    candidate.root && typeof candidate.root === "object"
      ? (candidate.root as TemplateLayoutData["root"])
      : { props: {} };

  return {
    content: content
      .filter((item): item is Record<string, unknown> =>
        !!item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).type === "string" &&
        typeof (item as Record<string, unknown>).props === "object" &&
        (item as Record<string, unknown>).props !== null,
      )
      .map((item) => ({
        type: item.type as string,
        props: item.props as Record<string, unknown>,
      })),
    root,
  };
}

function cloneTemplate(template: StoredTemplate, overrides: Partial<StoredTemplate>) {
  return {
    ...template,
    ...overrides,
  };
}

@Injectable()
export class TemplatesService {
  constructor(
    private readonly store: TemplatesStore,
    private readonly applicationsStore?: TemplatesAnalyticsStore,
  ) {}

  listTemplates() {
    return this.store.list();
  }

  async getDefaultTemplateId(kind: StoredTemplate["kind"]) {
    const templates = await this.store.list();

    return (
      templates.find((template) => template.kind === kind && template.isDefault)?.id ??
      templates.find((template) => template.kind === kind)?.id ??
      null
    );
  }

  async createTemplate(input: TemplateInput) {
    const timestamp = new Date().toISOString();
    const kind = normalizeTemplateKind(input.kind);
    const template: StoredTemplate = {
      active: input.active ?? true,
      categories: normalizeCategories(input.categories),
      createdAt: timestamp,
      id: randomUUID(),
      isDefault: input.isDefault ?? false,
      kind,
      layout: normalizeLayout(input.layout),
      locale: normalizeLocale(input.locale),
      name: String(input.name ?? "").trim() || "Nouveau template",
      updatedAt: timestamp,
    };

    return this.persistWithDefaultConstraints(template);
  }

  async updateTemplate(templateId: string, input: TemplateInput) {
    const existing = await this.store.findById(templateId);

    if (!existing) {
      throw new NotFoundException("Le template est introuvable.");
    }

    const kind = existing.kind;
    const candidate: StoredTemplate = cloneTemplate(existing, {
      active: input.active ?? existing.active,
      categories:
        input.categories !== undefined
          ? normalizeCategories(input.categories)
          : existing.categories,
      isDefault: input.isDefault ?? existing.isDefault,
      kind,
      layout:
        input.layout !== undefined
          ? normalizeLayout(input.layout)
          : existing.layout,
      locale: normalizeLocale(input.locale ?? existing.locale),
      name: String(input.name ?? existing.name).trim() || existing.name,
      updatedAt: new Date().toISOString(),
    });

    return this.persistWithDefaultConstraints(candidate, existing.id);
  }

  async deleteTemplate(templateId: string) {
    const existing = await this.store.findById(templateId);

    if (!existing) {
      throw new NotFoundException("Le template est introuvable.");
    }

    const all = await this.store.list();
    const sameKindTemplates = all.filter(
      (candidate) => candidate.kind === existing.kind && candidate.id !== templateId,
    );

    if (existing.isDefault && sameKindTemplates.length === 0) {
      throw new ConflictException(
        "Impossible de supprimer le seul template de ce type.",
      );
    }

    // Drop first, promote second: `templates_single_default_per_kind_idx`
    // refuses two defaults of one kind, even for the instant in between.
    await this.store.remove(templateId);

    if (existing.isDefault) {
      await this.store.save({
        ...sameKindTemplates[0],
        isDefault: true,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async duplicateTemplate(templateId: string) {
    const existing = await this.store.findById(templateId);

    if (!existing) {
      throw new NotFoundException("Le template est introuvable.");
    }

    const timestamp = new Date().toISOString();

    return this.store.create({
      ...existing,
      active: false,
      createdAt: timestamp,
      id: randomUUID(),
      isDefault: false,
      name: `${existing.name} (copie)`,
      updatedAt: timestamp,
    });
  }

  async getAnalytics(): Promise<TemplatesAnalyticsPayload> {
    const templates = await this.store.list();
    const applications = (await this.applicationsStore?.listAll()) ?? [];
    const usage = new Map<
      string,
      { cvCount: number; letterCount: number; lastUsedAt: string | null }
    >();

    applications.forEach((application) => {
      if (application.cvTemplateId) {
        const current = usage.get(application.cvTemplateId) ?? {
          cvCount: 0,
          lastUsedAt: null,
          letterCount: 0,
        };

        usage.set(application.cvTemplateId, {
          ...current,
          cvCount: current.cvCount + 1,
          lastUsedAt:
            current.lastUsedAt && current.lastUsedAt > (application.cvGeneratedAt ?? "")
              ? current.lastUsedAt
              : (application.cvGeneratedAt ?? current.lastUsedAt),
        });
      }

      if (application.letterTemplateId) {
        const current = usage.get(application.letterTemplateId) ?? {
          cvCount: 0,
          lastUsedAt: null,
          letterCount: 0,
        };

        usage.set(application.letterTemplateId, {
          ...current,
          lastUsedAt:
            current.lastUsedAt &&
            current.lastUsedAt > (application.letterGeneratedAt ?? "")
              ? current.lastUsedAt
              : (application.letterGeneratedAt ?? current.lastUsedAt),
          letterCount: current.letterCount + 1,
        });
      }
    });

    const topTemplates: TemplateUsageMetric[] = templates
      .map((template) => {
        const entry = usage.get(template.id);

        return {
          active: template.active,
          id: template.id,
          isDefault: template.isDefault,
          kind: template.kind,
          lastUsedAt: entry?.lastUsedAt ?? null,
          locale: template.locale,
          name: template.name,
          usageCount: (entry?.cvCount ?? 0) + (entry?.letterCount ?? 0),
        };
      })
      .sort((left, right) => {
        if (left.usageCount !== right.usageCount) {
          return right.usageCount - left.usageCount;
        }

        if (left.lastUsedAt && right.lastUsedAt && left.lastUsedAt !== right.lastUsedAt) {
          return right.lastUsedAt.localeCompare(left.lastUsedAt);
        }

        return left.name.localeCompare(right.name);
      })
      .slice(0, 5);

    const summary: TemplateAnalyticsSummary = {
      activeTemplates: templates.filter((template) => template.active).length,
      defaultTemplates: templates.filter((template) => template.isDefault).length,
      generatedCvCount: [...usage.values()].reduce(
        (total, entry) => total + entry.cvCount,
        0,
      ),
      generatedLetterCount: [...usage.values()].reduce(
        (total, entry) => total + entry.letterCount,
        0,
      ),
      templatesByKind: {
        cv: templates.filter((template) => template.kind === TEMPLATE_KIND_CV).length,
        letter: templates.filter((template) => template.kind === TEMPLATE_KIND_LETTER).length,
      },
      topTemplates,
      totalTemplates: templates.length,
    };

    const rows: TemplateExportRow[] = templates.map((template) => {
      const entry = usage.get(template.id);

      return {
        active: template.active ? "yes" : "no",
        categories: template.categories.join("|"),
        generatedCvCount: String(entry?.cvCount ?? 0),
        generatedLetterCount: String(entry?.letterCount ?? 0),
        isDefault: template.isDefault ? "yes" : "no",
        kind: template.kind,
        lastUsedAt: entry?.lastUsedAt ?? "",
        locale: template.locale,
        name: template.name,
        templateId: template.id,
        updatedAt: template.updatedAt,
      };
    });

    return {
      csv: toCsv(TEMPLATE_EXPORT_HEADERS, rows),
      summary,
    };
  }

  private async persistWithDefaultConstraints(
    template: StoredTemplate,
    currentId?: string,
  ) {
    const allTemplates = await this.store.list();
    const hasAnotherDefault = allTemplates.some(
      (candidate) =>
        candidate.kind === template.kind &&
        candidate.id !== currentId &&
        candidate.isDefault,
    );

    if (template.isDefault) {
      // Clear the old default before writing the new one, or the partial
      // unique index rejects the pair.
      for (const candidate of allTemplates.filter(
        (entry) => entry.kind === template.kind && entry.id !== currentId,
      )) {
        await this.store.save({
          ...candidate,
          isDefault: false,
          updatedAt: template.updatedAt,
        });
      }
    } else if (!hasAnotherDefault) {
      template = {
        ...template,
        isDefault: true,
      };
    }

    if (currentId) {
      return this.store.save(template);
    }

    return this.store.create(template);
  }
}

const TEMPLATE_EXPORT_HEADERS: Array<keyof TemplateExportRow> = [
  "templateId",
  "name",
  "kind",
  "locale",
  "active",
  "isDefault",
  "categories",
  "generatedCvCount",
  "generatedLetterCount",
  "lastUsedAt",
  "updatedAt",
];

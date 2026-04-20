import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TEMPLATE_KIND_CV, TEMPLATE_KIND_LETTER } from "@cvforge/types";
import { randomUUID } from "node:crypto";
import type { StoredTemplate, TemplatesStore, TemplateInput } from "./templates.types";

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

function normalizeLayout(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new BadRequestException("Le template doit contenir un layout JSON.");
  }

  const blocks = (value as { blocks?: unknown }).blocks;

  if (!Array.isArray(blocks)) {
    throw new BadRequestException("Le layout du template doit contenir des blocs.");
  }

  return {
    blocks: blocks
      .map((block) => {
        if (
          !block ||
          typeof block !== "object" ||
          typeof (block as { id?: unknown }).id !== "string" ||
          typeof (block as { name?: unknown }).name !== "string" ||
          typeof (block as { props?: unknown }).props !== "object" ||
          (block as { props?: unknown }).props === null
        ) {
          return null;
        }

        return {
          id: (block as { id: string }).id.trim(),
          name: (block as { name: string }).name.trim(),
          props: (block as { props: Record<string, unknown> }).props,
        };
      })
      .filter((block): block is { id: string; name: string; props: Record<string, unknown> } => block !== null),
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
  constructor(private readonly store: TemplatesStore) {}

  listTemplates() {
    return this.store.list();
  }

  createTemplate(input: TemplateInput) {
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

  updateTemplate(templateId: string, input: TemplateInput) {
    const existing = this.store.findById(templateId);

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

  deleteTemplate(templateId: string) {
    const existing = this.store.findById(templateId);

    if (!existing) {
      throw new NotFoundException("Le template est introuvable.");
    }

    const sameKindTemplates = this.store
      .list()
      .filter((candidate) => candidate.kind === existing.kind && candidate.id !== templateId);

    if (existing.isDefault && sameKindTemplates.length > 0) {
      const next = sameKindTemplates[0];

      this.store.save({
        ...next,
        isDefault: true,
        updatedAt: new Date().toISOString(),
      });
    } else if (existing.isDefault && sameKindTemplates.length === 0) {
      throw new ConflictException(
        "Impossible de supprimer le seul template de ce type.",
      );
    }

    this.store.remove(templateId);
  }

  duplicateTemplate(templateId: string) {
    const existing = this.store.findById(templateId);

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

  private persistWithDefaultConstraints(
    template: StoredTemplate,
    currentId?: string,
  ) {
    const allTemplates = this.store.list();
    const hasAnotherDefault = allTemplates.some(
      (candidate) =>
        candidate.kind === template.kind &&
        candidate.id !== currentId &&
        candidate.isDefault,
    );

    if (template.isDefault) {
      allTemplates
        .filter(
          (candidate) =>
            candidate.kind === template.kind && candidate.id !== currentId,
        )
        .forEach((candidate) => {
          this.store.save({
            ...candidate,
            isDefault: false,
            updatedAt: template.updatedAt,
          });
        });
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

import { describe, expect, it } from "vitest";
import { TEMPLATE_KIND_CV, TEMPLATE_KIND_LETTER } from "@cvforge/types";
import { TemplatesService } from "./templates.service";
import type { StoredTemplate, TemplatesStore } from "./templates.types";

function makeStore(seedTemplates: StoredTemplate[] = []): TemplatesStore {
  const templates = new Map(seedTemplates.map((template) => [template.id, template]));

  return {
    create(template) {
      templates.set(template.id, template);
      return template;
    },
    findById(templateId) {
      return templates.get(templateId) ?? null;
    },
    list() {
      return [...templates.values()];
    },
    save(template) {
      templates.set(template.id, template);
      return template;
    },
  };
}

function makeSeedTemplate(id: string, kind: StoredTemplate["kind"]): StoredTemplate {
  return {
    active: true,
    categories: ["ATS"],
    createdAt: "2026-04-20T12:00:00.000Z",
    id,
    isDefault: true,
    kind,
    layout: { blocks: [] },
    locale: "fr",
    name: `${kind.toUpperCase()} ATS`,
    updatedAt: "2026-04-20T12:00:00.000Z",
  };
}

describe("TemplatesService", () => {
  it("creates templates and keeps one default per kind", () => {
    const store = makeStore([
      makeSeedTemplate("cv-default", TEMPLATE_KIND_CV),
      makeSeedTemplate("letter-default", TEMPLATE_KIND_LETTER),
    ]);
    const service = new TemplatesService(store);

    const created = service.createTemplate({
      categories: ["Moderne"],
      isDefault: true,
      kind: TEMPLATE_KIND_CV,
      layout: { blocks: [] },
      locale: "en",
      name: "CV Moderne",
    });

    expect(created.kind).toBe(TEMPLATE_KIND_CV);
    expect(created.locale).toBe("en");
    expect(created.isDefault).toBe(true);
    expect(store.findById("cv-default")?.isDefault).toBe(false);
  });

  it("updates templates and duplicates them without making the copy default", () => {
    const store = makeStore([makeSeedTemplate("cv-default", TEMPLATE_KIND_CV)]);
    const service = new TemplatesService(store);
    const templateId = store.list()[0]?.id ?? "cv-default";

    const updated = service.updateTemplate(templateId, {
      categories: ["ATS", "Minimaliste"],
      name: "CV ATS revise",
    });
    const duplicated = service.duplicateTemplate(templateId);

    expect(updated.name).toBe("CV ATS revise");
    expect(updated.categories).toEqual(["ATS", "Minimaliste"]);
    expect(duplicated.id).not.toBe(templateId);
    expect(duplicated.isDefault).toBe(false);
    expect(duplicated.active).toBe(false);
  });

  it("rejects updates for unknown templates", () => {
    const service = new TemplatesService(makeStore());

    expect(() =>
      service.updateTemplate("missing", {
        name: "Missing",
      }),
    ).toThrow(/introuvable/);
  });
});

import { describe, expect, it } from "vitest";
import {
  TEMPLATE_KIND_CV,
  TEMPLATE_KIND_LETTER,
  type DraftApplication,
} from "@cvforge/types";
import { TemplatesService } from "./templates.service";
import type {
  StoredTemplate,
  TemplatesAnalyticsStore,
  TemplatesStore,
} from "./templates.types";

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
    remove(templateId) {
      templates.delete(templateId);
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
    layout: { content: [], root: { props: {} } },
    locale: "fr",
    name: `${kind.toUpperCase()} ATS`,
    updatedAt: "2026-04-20T12:00:00.000Z",
  };
}

function makeApplication(
  overrides: Partial<DraftApplication> = {},
): DraftApplication {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    cvGeneratedAt: null,
    cvTemplateId: null,
    id: "app-001",
    letterGeneratedAt: null,
    letterTemplateId: null,
    offerTextPreview: "Preview",
    offerUrl: null,
    sourceLabel: "Manual",
    sourceType: "text",
    status: "draft",
    statusHistory: [{ changedAt: "2026-04-20T12:00:00.000Z", status: "draft" }],
    updatedAt: "2026-04-20T12:00:00.000Z",
    userEmail: "user@example.com",
    extracted: {
      companyName: "Acme",
      contractType: null,
      language: "fr",
      location: null,
      requirements: [],
      responsibilities: [],
      salaryRange: null,
      summary: "Summary",
      title: "Role",
    },
    ...overrides,
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
      layout: { content: [], root: { props: {} } },
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

  it("deletes a non-default template and leaves the default intact", () => {
    const store = makeStore([
      makeSeedTemplate("cv-default", TEMPLATE_KIND_CV),
      { ...makeSeedTemplate("cv-other", TEMPLATE_KIND_CV), isDefault: false },
    ]);
    const service = new TemplatesService(store);

    service.deleteTemplate("cv-other");

    expect(store.findById("cv-other")).toBeNull();
    expect(store.findById("cv-default")?.isDefault).toBe(true);
  });

  it("transfers the default flag when deleting the current default", () => {
    const store = makeStore([
      makeSeedTemplate("cv-default", TEMPLATE_KIND_CV),
      { ...makeSeedTemplate("cv-other", TEMPLATE_KIND_CV), isDefault: false },
    ]);
    const service = new TemplatesService(store);

    service.deleteTemplate("cv-default");

    expect(store.findById("cv-default")).toBeNull();
    expect(store.findById("cv-other")?.isDefault).toBe(true);
  });

  it("refuses to delete the last template of a kind", () => {
    const store = makeStore([makeSeedTemplate("cv-only", TEMPLATE_KIND_CV)]);
    const service = new TemplatesService(store);

    expect(() => service.deleteTemplate("cv-only")).toThrow(/seul template/);
  });

  it("rejects deletion of unknown templates", () => {
    const service = new TemplatesService(makeStore());

    expect(() => service.deleteTemplate("missing")).toThrow(/introuvable/);
  });

  it("builds analytics and CSV export from template usage", () => {
    const templatesStore = makeStore([
      makeSeedTemplate("cv-default", TEMPLATE_KIND_CV),
      makeSeedTemplate("letter-default", TEMPLATE_KIND_LETTER),
      {
        ...makeSeedTemplate("cv-secondary", TEMPLATE_KIND_CV),
        isDefault: false,
        name: "CV Moderne",
      },
    ]);
    const applicationsStore: TemplatesAnalyticsStore = {
      listAll: () =>
        [
          makeApplication({
            cvGeneratedAt: "2026-04-21T10:00:00.000Z",
            cvTemplateId: "cv-default",
            id: "app-cv-1",
          }),
          makeApplication({
            cvGeneratedAt: "2026-04-22T10:00:00.000Z",
            cvTemplateId: "cv-default",
            id: "app-cv-2",
          }),
          makeApplication({
            id: "app-letter-1",
            letterGeneratedAt: "2026-04-22T11:00:00.000Z",
            letterTemplateId: "letter-default",
          }),
        ] as never[],
    };
    const service = new TemplatesService(templatesStore, applicationsStore);

    const analytics = service.getAnalytics();

    expect(analytics.summary.totalTemplates).toBe(3);
    expect(analytics.summary.generatedCvCount).toBe(2);
    expect(analytics.summary.generatedLetterCount).toBe(1);
    expect(analytics.summary.topTemplates[0]).toMatchObject({
      id: "cv-default",
      usageCount: 2,
    });
    expect(analytics.csv).toContain("templateId,name,kind");
    expect(analytics.csv).toContain("cv-default");
    expect(analytics.csv).toContain("letter-default");
  });
});

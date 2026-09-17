import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  TEMPLATE_KIND_CV,
  TEMPLATE_KIND_LETTER,
  type DraftApplication,
} from "@cvforge/types";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgTemplatesStore } from "./templates.pg-store";
import { TemplatesService } from "./templates.service";
import type {
  StoredTemplate,
  TemplatesAnalyticsStore,
  TemplatesStore,
} from "./templates.types";

let testDatabase: TestDatabase;
let store: TemplatesStore;

/**
 * Seeds the real Postgres-backed store. The single-default-per-kind rule is a
 * partial unique index now, so the suite runs against the engine that enforces
 * it rather than a Map that cannot.
 */
async function makeStore(seedTemplates: StoredTemplate[] = []) {
  for (const template of seedTemplates) {
    await store.create(template);
  }

  return store;
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
  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgTemplatesStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("creates templates and keeps one default per kind", async () => {
    const store = await makeStore([
      makeSeedTemplate("cv-default", TEMPLATE_KIND_CV),
      makeSeedTemplate("letter-default", TEMPLATE_KIND_LETTER),
    ]);
    const service = new TemplatesService(store);

    const created = await service.createTemplate({
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
    await expect(store.findById("cv-default")).resolves.toMatchObject({
      isDefault: false,
    });
  });

  it("updates templates and duplicates them without making the copy default", async () => {
    const store = await makeStore([makeSeedTemplate("cv-default", TEMPLATE_KIND_CV)]);
    const service = new TemplatesService(store);
    const templateId = (await store.list())[0]?.id ?? "cv-default";

    const updated = await service.updateTemplate(templateId, {
      categories: ["ATS", "Minimaliste"],
      name: "CV ATS revise",
    });
    const duplicated = await service.duplicateTemplate(templateId);

    expect(updated.name).toBe("CV ATS revise");
    expect(updated.categories).toEqual(["ATS", "Minimaliste"]);
    expect(duplicated.id).not.toBe(templateId);
    expect(duplicated.isDefault).toBe(false);
    expect(duplicated.active).toBe(false);
  });

  it("rejects updates for unknown templates", async () => {
    const service = new TemplatesService(await makeStore());

    await expect(
      service.updateTemplate("missing", { name: "Missing" }),
    ).rejects.toThrow(/introuvable/);
  });

  it("deletes a non-default template and leaves the default intact", async () => {
    const store = await makeStore([
      makeSeedTemplate("cv-default", TEMPLATE_KIND_CV),
      { ...makeSeedTemplate("cv-other", TEMPLATE_KIND_CV), isDefault: false },
    ]);
    const service = new TemplatesService(store);

    await service.deleteTemplate("cv-other");

    await expect(store.findById("cv-other")).resolves.toBeNull();
    await expect(store.findById("cv-default")).resolves.toMatchObject({
      isDefault: true,
    });
  });

  it("transfers the default flag when deleting the current default", async () => {
    const store = await makeStore([
      makeSeedTemplate("cv-default", TEMPLATE_KIND_CV),
      { ...makeSeedTemplate("cv-other", TEMPLATE_KIND_CV), isDefault: false },
    ]);
    const service = new TemplatesService(store);

    await service.deleteTemplate("cv-default");

    await expect(store.findById("cv-default")).resolves.toBeNull();
    await expect(store.findById("cv-other")).resolves.toMatchObject({
      isDefault: true,
    });
  });

  it("refuses to delete the last template of a kind", async () => {
    const store = await makeStore([makeSeedTemplate("cv-only", TEMPLATE_KIND_CV)]);
    const service = new TemplatesService(store);

    await expect(service.deleteTemplate("cv-only")).rejects.toThrow(
      /seul template/,
    );
  });

  it("rejects deletion of unknown templates", async () => {
    const service = new TemplatesService(await makeStore());

    await expect(service.deleteTemplate("missing")).rejects.toThrow(
      /introuvable/,
    );
  });

  it("builds analytics and CSV export from template usage", async () => {
    const templatesStore = await makeStore([
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

    const analytics = await service.getAnalytics();

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

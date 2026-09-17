import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PgTemplatesStore } from "../templates/templates.pg-store";
import { importLegacyTemplates } from "./import-legacy-templates";
import { createTestDatabase, type TestDatabase } from "./testing/test-database";

const SEEDED_CV_ID = "template-cv-ats";

function legacyTemplate(id: string, overrides: Record<string, unknown> = {}) {
  return {
    active: true,
    categories: ["ATS"],
    createdAt: "2026-04-20T00:00:00.000Z",
    id,
    isDefault: false,
    kind: "cv",
    layout: { content: [], root: { props: {} } },
    locale: "fr",
    name: `Template ${id}`,
    updatedAt: "2026-04-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("importLegacyTemplates", () => {
  let testDatabase: TestDatabase;
  let store: PgTemplatesStore;
  const directory = mkdtempSync(join(tmpdir(), "cvforge-legacy-templates-"));

  function writeState(templates: Array<ReturnType<typeof legacyTemplate>>) {
    const filePath = join(directory, `${templates.length}-${Date.now()}.json`);

    writeFileSync(
      filePath,
      JSON.stringify({
        templates: Object.fromEntries(templates.map((t) => [t.id, t])),
      }),
    );

    return filePath;
  }

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

  it("records a missing file as imported, with nothing to copy", async () => {
    const result = await importLegacyTemplates(
      testDatabase.db,
      join(directory, "does-not-exist.json"),
    );

    expect(result).toEqual({ status: "imported", templates: 0 });
    await expect(store.list()).resolves.toEqual([]);
  });

  it("copies the legacy templates in", async () => {
    const filePath = writeState([
      legacyTemplate("cv-custom"),
      legacyTemplate("letter-custom", { kind: "letter" }),
    ]);

    const result = await importLegacyTemplates(testDatabase.db, filePath);

    expect(result).toEqual({ status: "imported", templates: 2 });
    expect((await store.list()).map(({ id }) => id).sort()).toEqual([
      "cv-custom",
      "letter-custom",
    ]);
  });

  it("runs once per environment", async () => {
    const filePath = writeState([legacyTemplate("cv-custom")]);

    await importLegacyTemplates(testDatabase.db, filePath);
    const second = await importLegacyTemplates(testDatabase.db, filePath);

    expect(second).toEqual({ status: "already_imported" });
    await expect(store.list()).resolves.toHaveLength(1);
  });

  it("lets the admin's chosen default win over the seeded one", async () => {
    // Stands in for the seed migration, which has already run in production.
    await store.create({
      active: true,
      categories: ["ATS"],
      createdAt: "2026-04-20T00:00:00.000Z",
      id: SEEDED_CV_ID,
      isDefault: true,
      kind: "cv",
      layout: { content: [], root: { props: {} } },
      locale: "fr",
      name: "CV ATS par defaut",
      updatedAt: "2026-04-20T00:00:00.000Z",
    });

    const filePath = writeState([
      legacyTemplate(SEEDED_CV_ID),
      legacyTemplate("cv-chosen", { isDefault: true }),
    ]);

    await importLegacyTemplates(testDatabase.db, filePath);

    await expect(store.findById("cv-chosen")).resolves.toMatchObject({
      isDefault: true,
    });
    await expect(store.findById(SEEDED_CV_ID)).resolves.toMatchObject({
      isDefault: false,
    });
  });

  it("overwrites a seeded template with the file's content", async () => {
    await store.create({
      active: true,
      categories: [],
      createdAt: "2026-04-20T00:00:00.000Z",
      id: SEEDED_CV_ID,
      isDefault: true,
      kind: "cv",
      layout: { content: [], root: { props: {} } },
      locale: "fr",
      name: "Seeded name",
      updatedAt: "2026-04-20T00:00:00.000Z",
    });

    const filePath = writeState([
      legacyTemplate(SEEDED_CV_ID, { isDefault: true, name: "Edited by admin" }),
    ]);

    await importLegacyTemplates(testDatabase.db, filePath);

    await expect(store.findById(SEEDED_CV_ID)).resolves.toMatchObject({
      isDefault: true,
      name: "Edited by admin",
    });
  });
});

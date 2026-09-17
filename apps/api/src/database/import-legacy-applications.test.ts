import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PgApplicationsStore } from "../applications/applications.pg-store";
import { importLegacyApplications } from "./import-legacy-applications";
import { createTestDatabase, type TestDatabase } from "./testing/test-database";

function legacyApplication(id: string, overrides: Record<string, unknown> = {}) {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    extracted: {
      companyName: "Acme",
      contractType: null,
      language: "fr",
      location: "Paris",
      requirements: [],
      responsibilities: [],
      salaryRange: null,
      summary: "Resume",
      title: "Product Engineer",
    },
    id,
    offerTextPreview: "Preview",
    offerUrl: null,
    rawOfferText: "Long offer text",
    sourceLabel: "Texte colle",
    sourceType: "text",
    status: "sent",
    statusHistory: [{ changedAt: "2026-04-20T12:00:00.000Z", status: "sent" }],
    updatedAt: "2026-04-21T12:00:00.000Z",
    userEmail: "user@example.com",
    ...overrides,
  };
}

const cvContent = { candidate: { firstName: "Jane" }, language: "fr" };

describe("importLegacyApplications", () => {
  let testDatabase: TestDatabase;
  let store: PgApplicationsStore;
  const directory = mkdtempSync(join(tmpdir(), "cvforge-legacy-apps-"));
  let fileCounter = 0;

  function writeState(entries: Array<Record<string, unknown>>) {
    const filePath = join(directory, `state-${(fileCounter += 1)}.json`);

    writeFileSync(
      filePath,
      JSON.stringify({
        applications: Object.fromEntries(
          entries.map((entry) => [entry.id as string, entry]),
        ),
      }),
    );

    return filePath;
  }

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgApplicationsStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("records a missing file as imported, with nothing to copy", async () => {
    const result = await importLegacyApplications(
      testDatabase.db,
      join(directory, "does-not-exist.json"),
    );

    expect(result).toEqual({
      status: "imported",
      applications: 0,
      cvVersions: 0,
      letterVersions: 0,
      skipped: 0,
    });
  });

  it("copies the applications in", async () => {
    const filePath = writeState([
      legacyApplication("app-1"),
      legacyApplication("app-2", { userEmail: "other@example.com" }),
    ]);

    const result = await importLegacyApplications(testDatabase.db, filePath);

    expect(result).toMatchObject({ applications: 2, skipped: 0 });
    await expect(store.listAll()).resolves.toHaveLength(2);
  });

  it("runs once per environment", async () => {
    const filePath = writeState([legacyApplication("app-1")]);

    await importLegacyApplications(testDatabase.db, filePath);

    await expect(
      importLegacyApplications(testDatabase.db, filePath),
    ).resolves.toEqual({ status: "already_imported" });
  });

  it("materialises the v1 snapshot the file store only ever synthesised", async () => {
    // No `cvVersions` on disk: the store rebuilt a v1 entry from `cvContent`
    // on every read and never wrote it down. Without this the history is lost.
    const filePath = writeState([
      legacyApplication("app-1", {
        cvContent,
        cvGeneratedAt: "2026-04-20T13:00:00.000Z",
        cvTemplateId: "template-cv-ats",
      }),
    ]);

    const result = await importLegacyApplications(testDatabase.db, filePath);

    expect(result).toMatchObject({ cvVersions: 1 });
    await expect(store.findById("app-1")).resolves.toMatchObject({
      cvVersions: [
        {
          createdAt: "2026-04-20T13:00:00.000Z",
          id: "app-1-cv-v1",
          source: "generation",
          templateId: "template-cv-ats",
          versionNumber: 1,
        },
      ],
    });
  });

  it("keeps an explicit version list untouched", async () => {
    const filePath = writeState([
      legacyApplication("app-1", {
        cvContent,
        cvVersions: [
          {
            content: cvContent,
            createdAt: "2026-04-22T00:00:00.000Z",
            id: "custom-v1",
            source: "manual_save",
            templateId: null,
            versionNumber: 1,
          },
        ],
      }),
    ]);

    await importLegacyApplications(testDatabase.db, filePath);

    const found = await store.findById("app-1");

    expect(found?.cvVersions?.map(({ id }) => id)).toEqual(["custom-v1"]);
  });

  it("fills the gaps the file store used to patch on read", async () => {
    const filePath = writeState([
      {
        createdAt: "2026-04-20T12:00:00.000Z",
        extracted: legacyApplication("x").extracted,
        id: "bare",
        offerTextPreview: "Preview",
        offerUrl: null,
        rawOfferText: "Text",
        sourceLabel: "Texte colle",
        sourceType: "text",
        status: "not-a-status",
        updatedAt: "2026-04-20T12:00:00.000Z",
        userEmail: "user@example.com",
      },
    ]);

    await importLegacyApplications(testDatabase.db, filePath);

    await expect(store.findById("bare")).resolves.toMatchObject({
      cvContent: null,
      interviewReports: [],
      status: "draft",
      statusHistory: [
        { changedAt: "2026-04-20T12:00:00.000Z", status: "draft" },
      ],
    });
  });

  it("skips a record that cannot be attributed to an owner", async () => {
    const filePath = writeState([
      legacyApplication("app-1"),
      { ...legacyApplication("orphan"), userEmail: undefined },
    ]);

    const result = await importLegacyApplications(testDatabase.db, filePath);

    expect(result).toMatchObject({ applications: 1, skipped: 1 });
    await expect(store.findById("orphan")).resolves.toBeNull();
  });
});

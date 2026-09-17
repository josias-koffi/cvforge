import {
  APPLICATION_SOURCE_TEXT,
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_SENT,
} from "@cvforge/types";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgApplicationsStore } from "./applications.pg-store";
import type { StoredApplication } from "./applications.types";

let testDatabase: TestDatabase;
let store: PgApplicationsStore;

function makeApplication(
  id: string,
  overrides: Partial<StoredApplication> = {},
): StoredApplication {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    cvContent: null,
    cvGeneratedAt: null,
    cvTemplateId: null,
    cvVersions: [],
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
    interviewReports: [],
    letterContent: null,
    letterGeneratedAt: null,
    letterTemplateId: null,
    letterVersions: [],
    offerTextPreview: "Preview",
    offerUrl: null,
    profileId: null,
    rawOfferText: "Long offer text",
    sourceLabel: "Texte colle",
    sourceType: APPLICATION_SOURCE_TEXT,
    status: APPLICATION_STATUS_DRAFT,
    statusHistory: [
      { changedAt: "2026-04-20T12:00:00.000Z", status: APPLICATION_STATUS_DRAFT },
    ],
    updatedAt: "2026-04-20T12:00:00.000Z",
    userEmail: "user@example.com",
    ...overrides,
  };
}

const cvContent = {
  candidate: { firstName: "Jane", lastName: "Doe" },
  language: "fr",
} as unknown as NonNullable<StoredApplication["cvContent"]>;

describe("PgApplicationsStore", () => {
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

  it("round-trips an application", async () => {
    await store.createDraft(makeApplication("app-1"));

    await expect(store.findById("app-1")).resolves.toEqual(
      makeApplication("app-1"),
    );
  });

  it("keeps applications scoped to their owner", async () => {
    await store.createDraft(makeApplication("app-1"));

    await expect(
      store.findByIdForUserEmail("user@example.com", "app-1"),
    ).resolves.toMatchObject({ id: "app-1" });
    await expect(
      store.findByIdForUserEmail("other@example.com", "app-1"),
    ).resolves.toBeNull();
  });

  it("lists a user's applications newest-created first", async () => {
    await store.createDraft(
      makeApplication("old", { createdAt: "2026-04-01T00:00:00.000Z" }),
    );
    await store.createDraft(
      makeApplication("recent", { createdAt: "2026-04-25T00:00:00.000Z" }),
    );
    await store.createDraft(
      makeApplication("other", { userEmail: "other@example.com" }),
    );

    const ids = (await store.listByUserEmail("user@example.com")).map(
      ({ id }) => id,
    );

    expect(ids).toEqual(["recent", "old"]);
  });

  it("lists everything most-recently-updated first", async () => {
    await store.createDraft(
      makeApplication("stale", { updatedAt: "2026-04-01T00:00:00.000Z" }),
    );
    await store.createDraft(
      makeApplication("fresh", { updatedAt: "2026-04-25T00:00:00.000Z" }),
    );

    const ids = (await store.listAll()).map(({ id }) => id);

    expect(ids).toEqual(["fresh", "stale"]);
  });

  it("stores document versions and reads them back in order", async () => {
    await store.createDraft(
      makeApplication("app-1", {
        cvContent,
        cvVersions: [
          {
            content: cvContent,
            createdAt: "2026-04-21T00:00:00.000Z",
            id: "app-1-cv-v2",
            source: "manual_save",
            templateId: "template-cv-ats",
            versionNumber: 2,
          },
          {
            content: cvContent,
            createdAt: "2026-04-20T00:00:00.000Z",
            id: "app-1-cv-v1",
            source: "generation",
            templateId: null,
            versionNumber: 1,
          },
        ],
      }),
    );

    const found = await store.findById("app-1");

    expect(found?.cvVersions?.map(({ versionNumber }) => versionNumber)).toEqual([
      1, 2,
    ]);
  });

  it("replaces the version list on save rather than appending to it", async () => {
    await store.createDraft(
      makeApplication("app-1", {
        cvVersions: [
          {
            content: cvContent,
            createdAt: "2026-04-20T00:00:00.000Z",
            id: "app-1-cv-v1",
            source: "generation",
            templateId: null,
            versionNumber: 1,
          },
        ],
      }),
    );

    await store.save(makeApplication("app-1", { cvVersions: [] }));

    await expect(store.findById("app-1")).resolves.toMatchObject({
      cvVersions: [],
    });
  });

  it("updates an application in place", async () => {
    await store.createDraft(makeApplication("app-1"));

    await store.save(
      makeApplication("app-1", { status: APPLICATION_STATUS_SENT }),
    );

    await expect(store.listAll()).resolves.toHaveLength(1);
    await expect(store.findById("app-1")).resolves.toMatchObject({
      status: APPLICATION_STATUS_SENT,
    });
  });

  it("cascades versions away when an account is purged", async () => {
    await store.createDraft(
      makeApplication("app-1", {
        cvVersions: [
          {
            content: cvContent,
            createdAt: "2026-04-20T00:00:00.000Z",
            id: "app-1-cv-v1",
            source: "generation",
            templateId: null,
            versionNumber: 1,
          },
        ],
      }),
    );
    await store.createDraft(
      makeApplication("other", { userEmail: "other@example.com" }),
    );

    await expect(store.deleteByUserEmail("user@example.com")).resolves.toBe(1);

    await expect(store.findById("app-1")).resolves.toBeNull();
    await expect(store.listAll()).resolves.toHaveLength(1);
  });
});

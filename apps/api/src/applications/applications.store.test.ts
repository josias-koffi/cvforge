import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileApplicationsStore } from "./applications.store";

const createdDirectories: string[] = [];

function makeStorePath() {
  const directory = mkdtempSync(join(tmpdir(), "cvforge-applications-store-"));
  createdDirectories.push(directory);

  return join(directory, "applications-state.json");
}

describe("FileApplicationsStore", () => {
  afterEach(() => {
    createdDirectories.splice(0).forEach((directory) => {
      rmSync(directory, { force: true, recursive: true });
    });
  });

  it("persists and sorts draft applications by recency", () => {
    const store = new FileApplicationsStore(makeStorePath());

    store.createDraft({
      createdAt: "2026-04-20T12:00:00.000Z",
      cvContent: null,
      cvGeneratedAt: null,
      id: "app_old",
      letterContent: null,
      letterGeneratedAt: null,
      offerTextPreview: "Old preview",
      offerUrl: "https://example.com/jobs/old",
      rawOfferText: "Old raw text",
      sourceLabel: "https://example.com/jobs/old",
      sourceType: "url",
      status: "draft",
      statusHistory: [
        {
          changedAt: "2026-04-20T12:00:00.000Z",
          status: "draft",
        },
      ],
      updatedAt: "2026-04-20T12:00:00.000Z",
      userEmail: "user@example.com",
      extracted: {
        companyName: null,
        contractType: null,
        language: "fr",
        location: null,
        requirements: [],
        responsibilities: [],
        salaryRange: null,
        summary: "Old summary",
        title: "Old title",
      },
    });
    store.createDraft({
      createdAt: "2026-04-20T13:00:00.000Z",
      cvContent: null,
      cvGeneratedAt: null,
      id: "app_new",
      letterContent: null,
      letterGeneratedAt: null,
      offerTextPreview: "New preview",
      offerUrl: "https://example.com/jobs/new",
      rawOfferText: "New raw text",
      sourceLabel: "https://example.com/jobs/new",
      sourceType: "url",
      status: "draft",
      statusHistory: [
        {
          changedAt: "2026-04-20T13:00:00.000Z",
          status: "draft",
        },
      ],
      updatedAt: "2026-04-20T13:00:00.000Z",
      userEmail: "user@example.com",
      extracted: {
        companyName: "Example",
        contractType: "CDI",
        language: "en",
        location: "Remote",
        requirements: ["Node.js"],
        responsibilities: ["Build APIs"],
        salaryRange: null,
        summary: "New summary",
        title: "New title",
      },
    });

    const applications = store.listByUserEmail("user@example.com");

    expect(applications.map((application) => application.id)).toEqual([
      "app_new",
      "app_old",
    ]);
  });

  it("returns an empty list when the state file does not exist or is invalid", () => {
    const path = makeStorePath();
    const store = new FileApplicationsStore(path);

    expect(store.listByUserEmail("user@example.com")).toEqual([]);
    expect(store.listAll()).toEqual([]);
  });

  it("hydrates legacy stored drafts without an explicit status history", () => {
    const path = makeStorePath();
    const store = new FileApplicationsStore(path);

    store.save({
      createdAt: "2026-04-20T12:00:00.000Z",
      cvContent: null,
      cvGeneratedAt: null,
      id: "legacy_app",
      letterContent: null,
      letterGeneratedAt: null,
      offerTextPreview: "Legacy preview",
      offerUrl: "https://example.com/jobs/legacy",
      rawOfferText: "Legacy raw text",
      sourceLabel: "https://example.com/jobs/legacy",
      sourceType: "url",
      status: "draft",
      statusHistory: [] as never[],
      updatedAt: "2026-04-20T12:00:00.000Z",
      userEmail: "user@example.com",
      extracted: {
        companyName: "Example",
        contractType: null,
        language: "fr",
        location: null,
        requirements: [],
        responsibilities: [],
        salaryRange: null,
        summary: "Legacy summary",
        title: "Legacy title",
      },
    });

    const [application] = store.listByUserEmail("user@example.com");

    expect(application?.statusHistory).toEqual([
      {
        changedAt: "2026-04-20T12:00:00.000Z",
        status: "draft",
      },
    ]);
  });

  it("lists all applications across users for admin analytics", () => {
    const store = new FileApplicationsStore(makeStorePath());

    store.createDraft({
      createdAt: "2026-04-20T12:00:00.000Z",
      cvContent: null,
      cvGeneratedAt: "2026-04-20T12:30:00.000Z",
      cvTemplateId: "template-cv-ats",
      id: "app-001",
      letterContent: null,
      letterGeneratedAt: null,
      letterTemplateId: null,
      offerTextPreview: "Preview",
      offerUrl: null,
      rawOfferText: "Raw",
      sourceLabel: "Manual",
      sourceType: "text",
      status: "draft",
      statusHistory: [
        { changedAt: "2026-04-20T12:00:00.000Z", status: "draft" },
      ],
      updatedAt: "2026-04-20T12:30:00.000Z",
      userEmail: "admin@example.com",
      extracted: {
        companyName: null,
        contractType: null,
        language: "fr",
        location: null,
        requirements: [],
        responsibilities: [],
        salaryRange: null,
        summary: "Summary",
        title: "Role",
      },
    });

    expect(store.listAll()).toHaveLength(1);
    expect(store.listAll()[0]?.cvTemplateId).toBe("template-cv-ats");
  });
});

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
      id: "app_old",
      offerTextPreview: "Old preview",
      offerUrl: "https://example.com/jobs/old",
      rawOfferText: "Old raw text",
      sourceLabel: "https://example.com/jobs/old",
      sourceType: "url",
      status: "draft",
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
      id: "app_new",
      offerTextPreview: "New preview",
      offerUrl: "https://example.com/jobs/new",
      rawOfferText: "New raw text",
      sourceLabel: "https://example.com/jobs/new",
      sourceType: "url",
      status: "draft",
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
  });
});

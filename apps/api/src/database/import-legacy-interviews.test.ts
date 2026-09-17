import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PgInterviewStore } from "../interview/interview.pg-store";
import { importLegacyInterviews } from "./import-legacy-interviews";
import { createTestDatabase, type TestDatabase } from "./testing/test-database";

function legacyChunk(sequence: number, overrides: Record<string, unknown> = {}) {
  return {
    chunkId: `chunk-${sequence}`,
    createdAt: "2026-04-24T13:00:01.000Z",
    endedAt: "2026-04-24T13:00:05.000Z",
    errorMessage: null,
    isFinal: false,
    mimeType: "audio/webm",
    sequence,
    startedAt: "2026-04-24T13:00:00.000Z",
    status: "transcribed",
    transcript: `Segment ${sequence}`,
    ...overrides,
  };
}

function legacySession(id: string, overrides: Record<string, unknown> = {}) {
  return {
    aiResponse: null,
    aiResponseGeneratedAt: null,
    aiStatus: "idle",
    applicationId: null,
    chunks: [],
    completedAt: null,
    createdAt: "2026-04-24T12:00:00.000Z",
    id,
    language: "fr",
    lastError: null,
    messages: [],
    prefetchedQuestion: null,
    profile: "standard",
    recoverable: true,
    report: null,
    status: "idle",
    transcript: "",
    updatedAt: "2026-04-24T12:00:00.000Z",
    userEmail: "user@example.com",
    ...overrides,
  };
}

describe("importLegacyInterviews", () => {
  let testDatabase: TestDatabase;
  let store: PgInterviewStore;
  const directory = mkdtempSync(join(tmpdir(), "cvforge-legacy-interviews-"));
  let fileCounter = 0;

  function writeState(sessions: Array<Record<string, unknown>>) {
    const filePath = join(directory, `state-${(fileCounter += 1)}.json`);

    writeFileSync(
      filePath,
      JSON.stringify({
        sessions: Object.fromEntries(
          sessions.map((session) => [session.id as string, session]),
        ),
      }),
    );

    return filePath;
  }

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
    store = new PgInterviewStore(testDatabase.db);
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(async () => {
    await testDatabase.reset();
  });

  it("records a missing file as imported, with nothing to copy", async () => {
    const result = await importLegacyInterviews(
      testDatabase.db,
      join(directory, "does-not-exist.json"),
    );

    expect(result).toEqual({
      status: "imported",
      sessions: 0,
      chunks: 0,
      skipped: 0,
    });
  });

  it("copies sessions and their chunks in", async () => {
    const filePath = writeState([
      legacySession("s-1", { chunks: [legacyChunk(1), legacyChunk(2)] }),
      legacySession("s-2", { userEmail: "other@example.com" }),
    ]);

    const result = await importLegacyInterviews(testDatabase.db, filePath);

    expect(result).toMatchObject({ sessions: 2, chunks: 2, skipped: 0 });
    await expect(store.findById("s-1")).resolves.toMatchObject({
      chunks: [{ sequence: 1 }, { sequence: 2 }],
    });
  });

  it("runs once per environment", async () => {
    const filePath = writeState([legacySession("s-1")]);

    await importLegacyInterviews(testDatabase.db, filePath);

    await expect(
      importLegacyInterviews(testDatabase.db, filePath),
    ).resolves.toEqual({ status: "already_imported" });
  });

  it("fills the gaps the file store used to patch on read", async () => {
    const filePath = writeState([
      {
        createdAt: "2026-04-24T12:00:00.000Z",
        id: "bare",
        status: "not-a-status",
        updatedAt: "2026-04-24T12:00:00.000Z",
        userEmail: "user@example.com",
      },
    ]);

    await importLegacyInterviews(testDatabase.db, filePath);

    await expect(store.findById("bare")).resolves.toMatchObject({
      aiStatus: "idle",
      chunks: [],
      language: "fr",
      messages: [],
      profile: "standard",
      report: null,
      status: "idle",
      transcript: "",
    });
  });

  it("repairs a chunk missing its fields", async () => {
    const filePath = writeState([
      legacySession("s-1", { chunks: [{ sequence: 1 }] }),
    ]);

    await importLegacyInterviews(testDatabase.db, filePath);

    await expect(store.findById("s-1")).resolves.toMatchObject({
      chunks: [
        {
          chunkId: "",
          isFinal: false,
          mimeType: "audio/webm",
          status: "transcribed",
          transcript: "",
        },
      ],
    });
  });

  it("skips a session that cannot be attributed to an owner", async () => {
    const filePath = writeState([
      legacySession("s-1"),
      { ...legacySession("orphan"), userEmail: undefined },
    ]);

    const result = await importLegacyInterviews(testDatabase.db, filePath);

    expect(result).toMatchObject({ sessions: 1, skipped: 1 });
    await expect(store.findById("orphan")).resolves.toBeNull();
  });
});

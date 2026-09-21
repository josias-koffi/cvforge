import type { InterviewTranscriptChunk } from "@cvforge/types";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  createTestDatabase,
  type TestDatabase,
} from "../database/testing/test-database";
import { PgInterviewStore } from "./interview.pg-store";
import type { StoredInterviewSession } from "./interview.types";

let testDatabase: TestDatabase;
let store: PgInterviewStore;

function makeChunk(
  sequence: number,
  overrides: Partial<InterviewTranscriptChunk> = {},
): InterviewTranscriptChunk {
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

function makeSession(
  id: string,
  overrides: Partial<StoredInterviewSession> = {},
): StoredInterviewSession {
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
    durationMinutes: 10,
    startedAt: null,
    context: null,
    ...overrides,
  };
}

describe("PgInterviewStore", () => {
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

  it("round-trips a session", async () => {
    await store.save(makeSession("s-1"));

    await expect(store.findById("s-1")).resolves.toEqual(makeSession("s-1"));
  });

  it("returns null for an unknown session", async () => {
    await expect(store.findById("missing")).resolves.toBeNull();
  });

  it("keeps sessions scoped to their owner", async () => {
    await store.save(makeSession("s-1"));

    await expect(
      store.findByIdForUserEmail("user@example.com", "s-1"),
    ).resolves.toMatchObject({ id: "s-1" });
    await expect(
      store.findByIdForUserEmail("other@example.com", "s-1"),
    ).resolves.toBeNull();
  });

  it("stores chunks and reads them back in sequence order", async () => {
    await store.save(
      makeSession("s-1", {
        chunks: [makeChunk(3), makeChunk(1), makeChunk(2)],
      }),
    );

    const found = await store.findById("s-1");

    expect(found?.chunks.map(({ sequence }) => sequence)).toEqual([1, 2, 3]);
    expect(found?.chunks[0]?.transcript).toBe("Segment 1");
  });

  it("replaces the chunk run on save rather than appending to it", async () => {
    await store.save(
      makeSession("s-1", { chunks: [makeChunk(1), makeChunk(2)] }),
    );

    await store.save(makeSession("s-1", { chunks: [makeChunk(1)] }));

    await expect(store.findById("s-1")).resolves.toMatchObject({
      chunks: [makeChunk(1)],
    });
  });

  it("keeps a failed chunk's error message", async () => {
    await store.save(
      makeSession("s-1", {
        chunks: [
          makeChunk(1, {
            errorMessage: "Transcription refusee",
            status: "failed",
            transcript: "",
          }),
        ],
      }),
    );

    await expect(store.findById("s-1")).resolves.toMatchObject({
      chunks: [{ errorMessage: "Transcription refusee", status: "failed" }],
    });
  });

  it("purges sessions completed before the cutoff, chunks included", async () => {
    await store.save(
      makeSession("old", {
        chunks: [makeChunk(1)],
        completedAt: "2026-03-01T00:00:00.000Z",
      }),
    );
    await store.save(
      makeSession("recent", { completedAt: "2026-04-24T00:00:00.000Z" }),
    );
    await store.save(makeSession("running"));

    await expect(
      store.purgeCompletedBefore("2026-04-01T00:00:00.000Z"),
    ).resolves.toBe(1);

    await expect(store.findById("old")).resolves.toBeNull();
    await expect(store.findById("recent")).resolves.not.toBeNull();
    await expect(store.findById("running")).resolves.not.toBeNull();
  });

  it("never purges a session that is still running", async () => {
    await store.save(makeSession("running"));

    await expect(
      store.purgeCompletedBefore("2099-01-01T00:00:00.000Z"),
    ).resolves.toBe(0);
  });

  describe("listByUserEmail", () => {
    it("returns only the caller's sessions, newest first", async () => {
      await store.save(
        makeSession("mine-old", { createdAt: "2026-04-01T10:00:00.000Z" }),
      );
      await store.save(
        makeSession("mine-new", { createdAt: "2026-04-05T10:00:00.000Z" }),
      );
      await store.save(
        makeSession("theirs", { userEmail: "other@example.com" }),
      );

      const rows = await store.listByUserEmail("user@example.com");

      expect(rows.map((row) => row.id)).toEqual(["mine-new", "mine-old"]);
    });

    it("honours the limit", async () => {
      for (const day of [1, 2, 3]) {
        await store.save(
          makeSession(`s-${day}`, {
            createdAt: `2026-04-0${day}T10:00:00.000Z`,
          }),
        );
      }

      const rows = await store.listByUserEmail("user@example.com", {
        limit: 2,
      });

      expect(rows.map((row) => row.id)).toEqual(["s-3", "s-2"]);
    });

    it("carries the score and response count of a finished session", async () => {
      await store.save(
        makeSession("scored", {
          completedAt: "2026-04-05T10:30:00.000Z",
          report: {
            createdAt: "2026-04-05T10:30:00.000Z",
            improvements: ["Aller droit au but."],
            metrics: [
              { detail: "", key: "clarity", label: "Clarté", score: 8 },
            ],
            overallScore: 7,
            summary: "Bonne session.",
            transcriptStats: {
              averageResponseDurationSeconds: 12,
              hesitationCount: 2,
              keywordCoverage: 40,
              keywordMentions: ["typescript"],
              responseCount: 4,
            },
          },
          status: "completed",
        }),
      );

      const [row] = await store.listByUserEmail("user@example.com");

      expect(row?.overallScore).toBe(7);
      expect(row?.responseCount).toBe(4);
      expect(row?.completedAt).toBe("2026-04-05T10:30:00.000Z");
    });

    it("leaves the score null while a session is unfinished", async () => {
      await store.save(makeSession("running"));

      const [row] = await store.listByUserEmail("user@example.com");

      expect(row?.overallScore).toBeNull();
      expect(row?.responseCount).toBe(0);
      expect(row?.applicationTitle).toBeNull();
    });
  });
});

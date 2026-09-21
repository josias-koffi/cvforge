import type { InterviewTranscriptChunk } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import type { StoredApplication } from "../applications/applications.types";
import {
  MAX_MESSAGES,
  appendMessage,
  averageChunkDurationSeconds,
  buildTranscriptStats,
  countHesitations,
  extractKeywords,
  joinTranscript,
  normalizeTranscript,
} from "./interview.stats";
import type { StoredInterviewSession } from "./interview.types";

function makeChunk(
  overrides: Partial<InterviewTranscriptChunk> = {},
): InterviewTranscriptChunk {
  return {
    chunkId: "chunk-1",
    createdAt: "2026-04-24T13:00:00.000Z",
    endedAt: "2026-04-24T13:00:10.000Z",
    errorMessage: null,
    isFinal: false,
    mimeType: "audio/wav",
    sequence: 1,
    startedAt: "2026-04-24T13:00:00.000Z",
    status: "transcribed",
    transcript: "Bonjour",
    ...overrides,
  };
}

function makeSession(
  overrides: Partial<StoredInterviewSession> = {},
): StoredInterviewSession {
  return {
    aiResponse: null,
    aiResponseGeneratedAt: null,
    aiStatus: "idle",
    applicationId: null,
    chunks: [],
    completedAt: null,
    createdAt: "2026-04-24T13:00:00.000Z",
    id: "interview_1",
    language: "fr",
    lastError: null,
    messages: [],
    prefetchedQuestion: null,
    profile: "standard",
    recoverable: true,
    report: null,
    status: "idle",
    transcript: "",
    updatedAt: "2026-04-24T13:00:00.000Z",
    userEmail: "user@example.com",
    ...overrides,
  };
}

describe("normalizeTranscript", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeTranscript("  bonjour \n\t à   tous ")).toBe(
      "bonjour à tous",
    );
  });
});

describe("appendMessage", () => {
  const message = (content: string) =>
    ({ role: "user", content, timestamp: "2026-04-24T13:00:00.000Z" }) as const;

  it("appends while under the context budget", () => {
    expect(appendMessage([message("a")], message("b"))).toHaveLength(2);
  });

  it("drops the oldest turns once the budget is reached", () => {
    const full = Array.from({ length: MAX_MESSAGES }, (_, i) =>
      message(`m${i}`),
    );

    const updated = appendMessage(full, message("newest"));

    expect(updated).toHaveLength(MAX_MESSAGES);
    expect(updated.at(-1)?.content).toBe("newest");
    expect(updated.at(0)?.content).toBe("m1");
  });
});

describe("joinTranscript", () => {
  it("joins transcribed chunks in sequence order, ignoring failed and empty ones", () => {
    const session = makeSession({
      chunks: [
        makeChunk({ chunkId: "c3", sequence: 3, transcript: "ça va" }),
        makeChunk({ chunkId: "c1", sequence: 1, transcript: "bonjour" }),
        makeChunk({ chunkId: "c2", sequence: 2, transcript: "" }),
        makeChunk({
          chunkId: "c4",
          sequence: 4,
          status: "failed",
          transcript: "perdu",
        }),
      ],
    });

    expect(joinTranscript(session)).toBe("bonjour ça va");
  });
});

describe("extractKeywords", () => {
  it("strips accents and case, and keeps only tokens of four characters or more", () => {
    expect(extractKeywords(["Éthique du Test", null, "test"])).toEqual([
      "ethique",
      "test",
    ]);
  });
});

describe("countHesitations", () => {
  it("counts filler words in French and English, whatever the case or accent", () => {
    expect(countHesitations("Euh, je pense... heu, um, ERM oui")).toBe(4);
  });

  it("does not match a filler buried inside a longer word", () => {
    expect(countHesitations("humour euphorie umbrella")).toBe(0);
  });

  it("is zero on an empty transcript", () => {
    expect(countHesitations("")).toBe(0);
  });
});

describe("averageChunkDurationSeconds", () => {
  it("averages usable spans and rounds", () => {
    expect(
      averageChunkDurationSeconds([
        makeChunk({ endedAt: "2026-04-24T13:00:10.000Z" }), // 10s
        makeChunk({ endedAt: "2026-04-24T13:00:05.000Z" }), // 5s
      ]),
    ).toBe(8); // 7.5 rounded
  });

  it("ignores chunks whose span is impossible rather than counting them as zero", () => {
    expect(
      averageChunkDurationSeconds([
        makeChunk({ endedAt: "2026-04-24T13:00:10.000Z" }),
        makeChunk({ endedAt: "2026-04-24T12:59:00.000Z" }), // ends before it starts
        makeChunk({ startedAt: "nonsense", endedAt: "nonsense" }),
      ]),
    ).toBe(10);
  });

  it("is null, not zero, when nothing is measurable", () => {
    expect(averageChunkDurationSeconds([])).toBeNull();
  });
});

describe("buildTranscriptStats", () => {
  const application = {
    extracted: {
      companyName: "Acme",
      requirements: ["TypeScript", "Postgres"],
      responsibilities: ["Analyser"],
      summary: "Role backend",
      title: "Product Engineer",
    },
  } as unknown as StoredApplication;

  it("scores coverage against the linked offer", () => {
    const stats = buildTranscriptStats(
      makeSession({
        chunks: [makeChunk()],
        transcript: "J'ai fait du typescript et du postgres",
      }),
      application,
    );

    expect(stats.keywordMentions).toContain("typescript");
    expect(stats.keywordMentions).toContain("postgres");
    expect(stats.keywordCoverage).toBeGreaterThan(0);
    expect(stats.responseCount).toBe(1);
  });

  it("reports zero coverage with no offer to compare to, never a flattering 100", () => {
    const stats = buildTranscriptStats(
      makeSession({ transcript: "du texte" }),
      null,
    );

    expect(stats.keywordCoverage).toBe(0);
    expect(stats.keywordMentions).toEqual([]);
  });
});

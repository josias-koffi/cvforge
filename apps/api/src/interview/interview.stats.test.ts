import type { InterviewTranscriptChunk } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import type { StoredApplication } from "../applications/applications.types";
import {
  MAX_PROMPT_MESSAGES,
  MAX_STORED_MESSAGES,
  selectPromptMessages,
  summarizeCoveredGround,
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
    durationMinutes: 10,
    startedAt: null,
    context: null,
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

/** Shared by the three suites below, which all talk about the same array. */
const message = (content: string) =>
  ({ role: "user", content, timestamp: "2026-04-24T13:00:00.000Z" }) as const;

describe("appendMessage", () => {
  it("appends while under the context budget", () => {
    expect(appendMessage([message("a")], message("b"))).toHaveLength(2);
  });

  it("keeps the whole interview, not just the prompt window", () => {
    // It used to cap at 20 on write, so a thirty-minute interview lost its
    // first half — and the final report reads from this very array.
    const long = Array.from({ length: 60 }, (_, i) => message(`m${i}`));

    const updated = appendMessage(long, message("newest"));

    expect(updated).toHaveLength(61);
    expect(updated.at(0)?.content).toBe("m0");
  });

  it("still stops an unbounded row", () => {
    const enormous = Array.from({ length: MAX_STORED_MESSAGES }, (_, i) =>
      message(`m${i}`),
    );

    const updated = appendMessage(enormous, message("newest"));

    expect(updated).toHaveLength(MAX_STORED_MESSAGES);
    expect(updated.at(-1)?.content).toBe("newest");
  });
});

describe("selectPromptMessages", () => {
  it("passes a short interview through untouched", () => {
    const messages = [message("a"), message("b")];

    expect(selectPromptMessages(messages)).toBe(messages);
  });

  it("keeps the window within the per-turn token budget", () => {
    const long = Array.from({ length: 60 }, (_, i) => message(`m${i}`));

    expect(selectPromptMessages(long)).toHaveLength(MAX_PROMPT_MESSAGES);
  });

  it("always keeps the opening, whatever else it drops", () => {
    // The opening is where the interviewer said what this interview is.
    const long = Array.from({ length: 60 }, (_, i) => message(`m${i}`));

    const window = selectPromptMessages(long);

    expect(window.at(0)?.content).toBe("m0");
    expect(window.at(-1)?.content).toBe("m59");
  });
});

describe("summarizeCoveredGround", () => {
  it("names the questions that fell out of the window", () => {
    // Otherwise a long interview circles back to a job it covered earlier.
    const summary = summarizeCoveredGround(
      [
        { content: "Parlez-moi de votre poste chez Acme.", role: "assistant", timestamp: "" },
        { content: "J'y etais lead.", role: "user", timestamp: "" },
      ],
      "fr",
    );

    expect(summary).toContain("Deja aborde");
    expect(summary).toContain("Acme");
    // Only what the recruiter asked, not what the candidate answered.
    expect(summary).not.toContain("lead");
  });

  it("is null when nothing was dropped", () => {
    expect(summarizeCoveredGround([], "fr")).toBeNull();
  });

  it("is null when only the candidate's words fell out", () => {
    expect(
      summarizeCoveredGround([{ content: "oui", role: "user", timestamp: "" }], "fr"),
    ).toBeNull();
  });

  it("stays short: it is paid for on every remaining turn", () => {
    const many = Array.from({ length: 40 }, () => ({
      content: "Une question assez longue sur le parcours du candidat.",
      role: "assistant" as const,
      timestamp: "",
    }));

    expect(summarizeCoveredGround(many, "fr")!.length).toBeLessThan(430);
  });

  it("speaks the interview's language", () => {
    const dropped = [{ content: "Tell me more.", role: "assistant" as const, timestamp: "" }];

    expect(summarizeCoveredGround(dropped, "en")).toContain("Already covered");
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

import type { InterviewTurnEvent } from "@cvforge/types";
import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { OpenRouterTranscriptionService } from "../ai/openrouter-transcription.service";
import type {
  OpenRouterVoiceService,
  VoiceTurnEvent,
} from "../ai/openrouter-voice.service";
import { InterviewTurnService } from "./interview-turn.service";
import type { InterviewStore, StoredInterviewSession } from "./interview.types";

const CHUNK = {
  chunkBase64: "AAAA",
  chunkId: "c1",
  endedAt: "2026-04-24T13:00:05.000Z",
  format: "wav",
  isFinal: false,
  mimeType: "audio/wav",
  sequence: 1,
  startedAt: "2026-04-24T13:00:00.000Z",
};

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
    id: "s1",
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

function createStore(session = makeSession()) {
  const saved: StoredInterviewSession[] = [];

  const store = {
    findById: async () => session,
    findByIdForUserEmail: async (email: string) =>
      email === session.userEmail ? session : null,
    save: async (next: StoredInterviewSession) => {
      saved.push(structuredClone(next));
      return next;
    },
    listByUserEmail: async () => [],
    deleteByUserEmail: async () => 0,
    purgeCompletedBefore: async () => 0,
  } as unknown as InterviewStore;

  return { saved, store };
}

function voiceYielding(events: VoiceTurnEvent[]): OpenRouterVoiceService {
  return {
    streamTurn: vi.fn(async function* () {
      for (const event of events) yield event;
    }),
  } as unknown as OpenRouterVoiceService;
}

function transcriberSaying(text: string | Promise<string>) {
  return {
    transcribe: vi.fn().mockReturnValue(Promise.resolve(text)),
  } as unknown as OpenRouterTranscriptionService;
}

async function collect(
  service: InterviewTurnService,
  email = "user@example.com",
) {
  const events: InterviewTurnEvent[] = [];
  for await (const event of service.streamTurn(email, "s1", CHUNK)) {
    events.push(event);
  }

  return events;
}

describe("InterviewTurnService", () => {
  it("streams the spoken reply and records both sides of the turn", async () => {
    const { saved, store } = createStore();
    const service = new InterviewTurnService(
      store,
      voiceYielding([
        { type: "audio", data: "QUJD" },
        { type: "transcript", text: "Et ensuite ?" },
      ]),
      transcriberSaying("J'ai mené la refonte."),
    );

    const events = await collect(service);

    expect(events).toContainEqual({ type: "audio", data: "QUJD" });
    expect(events).toContainEqual({ type: "reply", text: "Et ensuite ?" });
    expect(events).toContainEqual({
      type: "candidate",
      text: "J'ai mené la refonte.",
    });
    expect(events.at(-1)).toEqual({ type: "done" });

    const session = saved.at(-1)!;
    expect(session.messages.map((m) => [m.role, m.content])).toEqual([
      ["user", "J'ai mené la refonte."],
      ["assistant", "Et ensuite ?"],
    ]);
    expect(session.chunks[0]?.status).toBe("transcribed");
    expect(session.transcript).toBe("J'ai mené la refonte.");
    expect(session.status).toBe("ready");
  });

  it("transcribes alongside the voice rather than before it", async () => {
    // Waiting on transcription would add its latency to every single turn.
    let releaseTranscript: (text: string) => void = () => {}
    const slow = new Promise<string>((resolve) => {
      releaseTranscript = resolve
    })

    const { store } = createStore();
    const service = new InterviewTurnService(
      store,
      voiceYielding([{ type: "audio", data: "QUJD" }]),
      transcriberSaying(slow),
    );

    const events: InterviewTurnEvent[] = [];
    const run = (async () => {
      for await (const event of service.streamTurn(
        "user@example.com",
        "s1",
        CHUNK,
      )) {
        events.push(event);
        // The first audio frame reaches the candidate before transcription.
        if (event.type === "audio") releaseTranscript("réponse tardive");
      }
    })();

    await run;

    expect(events[0]).toEqual({ type: "audio", data: "QUJD" });
    expect(events).toContainEqual({
      type: "candidate",
      text: "réponse tardive",
    });
  });

  it("carries on when transcription fails, losing only the report detail", async () => {
    const { saved, store } = createStore();
    const service = new InterviewTurnService(
      store,
      voiceYielding([{ type: "transcript", text: "Continuons." }]),
      {
        transcribe: vi.fn().mockRejectedValue(new Error("stt down")),
      } as unknown as OpenRouterTranscriptionService,
    );

    const events = await collect(service);

    expect(events.at(-1)).toEqual({ type: "done" });
    expect(events).toContainEqual({ type: "candidate", text: "" });
    // The interviewer still spoke, so its reply is kept.
    expect(saved.at(-1)?.messages.map((m) => m.role)).toEqual(["assistant"]);
  });

  it("keeps the session usable when the interviewer fails", async () => {
    const { saved, store } = createStore();
    const service = new InterviewTurnService(
      store,
      {
        // Rejects before yielding anything, as an unreachable model does.
        streamTurn: vi.fn(() => ({
          [Symbol.asyncIterator]: () => ({
            next: () => Promise.reject(new Error("voix indisponible")),
          }),
        })),
      } as unknown as OpenRouterVoiceService,
      transcriberSaying("ma réponse"),
    );

    const events = await collect(service);

    expect(events.at(-1)).toEqual({
      type: "error",
      message: "voix indisponible",
    });

    const session = saved.at(-1)!;
    expect(session.status).toBe("error");
    expect(session.chunks[0]?.status).toBe("failed");
    // Recoverable: the candidate can simply speak again.
    expect(session.recoverable).toBe(true);
  });

  it("ignores a chunk it has already answered", async () => {
    // A retried upload must not charge for the turn a second time.
    const { saved, store } = createStore(
      makeSession({
        chunks: [
          {
            chunkId: "c1",
            createdAt: "2026-04-24T13:00:06.000Z",
            endedAt: "2026-04-24T13:00:05.000Z",
            errorMessage: null,
            isFinal: false,
            mimeType: "audio/wav",
            sequence: 1,
            startedAt: "2026-04-24T13:00:00.000Z",
            status: "transcribed",
            transcript: "déjà dit",
          },
        ],
      }),
    );
    const voice = voiceYielding([{ type: "audio", data: "QUJD" }]);
    const service = new InterviewTurnService(
      store,
      voice,
      transcriberSaying("x"),
    );

    await expect(collect(service)).resolves.toEqual([{ type: "done" }]);
    expect(voice.streamTurn).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  });

  it("refuses a session belonging to somebody else", async () => {
    const { store } = createStore();
    const service = new InterviewTurnService(
      store,
      voiceYielding([]),
      transcriberSaying("x"),
    );

    await expect(collect(service, "intruder@example.com")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("sends the recent history as text, never the past audio", async () => {
    const { store } = createStore(
      makeSession({
        messages: [
          {
            content: "premier tour",
            role: "user",
            timestamp: "2026-04-24T13:00:00.000Z",
          },
        ],
      }),
    );
    const voice = voiceYielding([{ type: "audio", data: "QUJD" }]);
    const service = new InterviewTurnService(
      store,
      voice,
      transcriberSaying("x"),
    );

    await collect(service);

    const [request] = (voice.streamTurn as ReturnType<typeof vi.fn>).mock
      .calls[0] as [{ history: unknown[]; systemPrompt: string }];
    expect(request.history).toEqual([
      { content: "premier tour", role: "user" },
    ]);
    expect(request.systemPrompt).toContain("recruteur");
  });
});

describe("InterviewTurnService.streamOpening", () => {
  async function collectOpening(
    service: InterviewTurnService,
    email = "user@example.com",
  ) {
    const events: InterviewTurnEvent[] = [];
    for await (const event of service.streamOpening(email, "s1")) {
      events.push(event);
    }

    return events;
  }

  it("speaks first and records the greeting as the interviewer's", async () => {
    const { saved, store } = createStore();
    const voice = voiceYielding([
      { type: "audio", data: "QUJD" },
      { type: "transcript", text: "Bonjour, parlez-moi de vous." },
    ]);
    const service = new InterviewTurnService(store, voice, transcriberSaying(""));

    const events = await collectOpening(service);

    expect(events).toContainEqual({ type: "audio", data: "QUJD" });
    expect(events.at(-1)).toEqual({ type: "done" });
    expect(saved.at(-1)!.messages.map((m) => [m.role, m.content])).toEqual([
      ["assistant", "Bonjour, parlez-moi de vous."],
    ]);
  });

  it("asks for the greeting as text, with no audio to answer", async () => {
    const { store } = createStore();
    const voice = voiceYielding([{ type: "transcript", text: "Bonjour." }]);
    const service = new InterviewTurnService(store, voice, transcriberSaying(""));

    await collectOpening(service);

    const request = (voice.streamTurn as unknown as ReturnType<typeof vi.fn>)
      .mock.calls[0]![0] as { audio?: unknown; instruction?: string };
    expect(request.audio).toBeUndefined();
    expect(request.instruction).toContain("entretien");
  });

  it("never transcribes: there is no candidate audio yet", async () => {
    const { store } = createStore();
    const transcriber = transcriberSaying("bruit");
    const service = new InterviewTurnService(
      store,
      voiceYielding([{ type: "transcript", text: "Bonjour." }]),
      transcriber,
    );

    await collectOpening(service);

    expect(transcriber.transcribe).not.toHaveBeenCalled();
  });

  it("stays silent on a session already under way", async () => {
    // A page reload must not make the recruiter greet the candidate twice.
    const { saved, store } = createStore(
      makeSession({
        messages: [
          {
            content: "Bonjour.",
            role: "assistant",
            timestamp: "2026-04-24T13:00:00.000Z",
          },
        ],
      }),
    );
    const voice = voiceYielding([{ type: "transcript", text: "Re-bonjour." }]);
    const service = new InterviewTurnService(store, voice, transcriberSaying(""));

    expect(await collectOpening(service)).toEqual([{ type: "done" }]);
    expect(voice.streamTurn).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  });

  it("reports a recruiter that could not open the interview", async () => {
    const { store } = createStore();
    const voice = {
      // Rejects before yielding anything, as an unreachable model does.
      streamTurn: vi.fn(() => ({
        [Symbol.asyncIterator]: () => ({
          next: () => Promise.reject(new Error("modele indisponible")),
        }),
      })),
    } as unknown as OpenRouterVoiceService;
    const service = new InterviewTurnService(store, voice, transcriberSaying(""));

    expect(await collectOpening(service)).toEqual([
      { type: "error", message: "modele indisponible" },
    ]);
  });

  it("refuses a session that is not the caller's", async () => {
    const { store } = createStore();
    const service = new InterviewTurnService(
      store,
      voiceYielding([]),
      transcriberSaying(""),
    );

    await expect(
      collectOpening(service, "someone@else.example"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("the interview agenda reaches the model", () => {
  /** The system prompt the voice service was handed on call `index`. */
  function promptAt(voice: OpenRouterVoiceService, index: number) {
    const calls = (voice.streamTurn as unknown as ReturnType<typeof vi.fn>).mock
      .calls;
    return (calls[index]![0] as { systemPrompt: string }).systemPrompt;
  }

  it("tells the recruiter which phase it is in", async () => {
    const { store } = createStore();
    const voice = voiceYielding([{ type: "transcript", text: "Et ensuite ?" }]);
    const service = new InterviewTurnService(store, voice, transcriberSaying("x"));

    await collect(service);

    expect(promptAt(voice, 0)).toContain("Phase actuelle");
  });

  it("moves the interview on as the clock runs", async () => {
    // The defect this whole lot exists for: one question, then the same
    // question for the rest of the session.
    const { store } = createStore(
      makeSession({
        startedAt: new Date(Date.now() - 14 * 60_000).toISOString(),
        messages: Array.from({ length: 12 }, (_, index) => ({
          content: `tour ${index}`,
          role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
          timestamp: "2026-04-24T13:00:00.000Z",
        })),
      }),
    );
    const voice = voiceYielding([{ type: "transcript", text: "Bien." }]);
    const service = new InterviewTurnService(store, voice, transcriberSaying("x"));

    await collect(service);

    const prompt = promptAt(voice, 0);
    expect(prompt).not.toContain("accueil");
  });

  it("asks for a conclusion once the time is spent", async () => {
    const { store } = createStore(
      makeSession({
        durationMinutes: 10,
        startedAt: new Date(Date.now() - 11 * 60_000).toISOString(),
      }),
    );
    const voice = voiceYielding([{ type: "transcript", text: "Merci." }]);
    const service = new InterviewTurnService(store, voice, transcriberSaying("x"));

    await collect(service);

    expect(promptAt(voice, 0)).toContain("Ne pose pas de nouvelle question");
  });

  it("starts the clock on the first turn, not when credits were spent", async () => {
    const { saved, store } = createStore();
    const service = new InterviewTurnService(
      store,
      voiceYielding([{ type: "transcript", text: "Bonjour." }]),
      transcriberSaying("x"),
    );

    await collect(service);

    expect(saved.at(-1)!.startedAt).not.toBeNull();
  });

  it("does not restart the clock on the second turn", async () => {
    const started = "2026-04-24T13:00:00.000Z";
    const { saved, store } = createStore(makeSession({ startedAt: started }));
    const service = new InterviewTurnService(
      store,
      voiceYielding([{ type: "transcript", text: "Bien." }]),
      transcriberSaying("x"),
    );

    await collect(service);

    expect(saved.at(-1)!.startedAt).toBe(started);
  });
});

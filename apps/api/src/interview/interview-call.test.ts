import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RealtimeSideband } from "../ai/openai-realtime.service";
import { CLOSING_GRACE_MS, InterviewCall, OVERTIME_GRACE_MS } from "./interview-call";
import type { StoredInterviewSession } from "./interview.types";

const sessionPrompt = vi.hoisted(() => ({
  buildSessionPrompt: vi.fn((_session: unknown, _covered: string | null) => "BRIEF"),
  coveredGroundOf: vi.fn((): string | null => null),
  isInterviewOver: vi.fn(() => false),
}));
vi.mock("./interview.session-prompt", () => sessionPrompt);

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
    context: null,
    createdAt: "2026-09-25T10:00:00.000Z",
    durationMinutes: 10,
    id: "s1",
    language: "fr",
    lastError: null,
    messages: [],
    prefetchedQuestion: null,
    profile: "standard",
    recoverable: true,
    report: null,
    startedAt: "2026-09-25T10:00:00.000Z",
    status: "ready",
    transcript: "",
    updatedAt: "2026-09-25T10:00:00.000Z",
    userEmail: "user@example.com",
    ...overrides,
  };
}

function setup(session = makeSession()) {
  const sent: Array<Record<string, unknown>> = [];
  const sideband: RealtimeSideband = {
    close: vi.fn(),
    send: (event) => sent.push(event),
  };
  const timers: Array<{ callback: () => void; ms: number }> = [];
  const deps = {
    clearTimer: vi.fn(),
    hangup: vi.fn().mockResolvedValue(undefined),
    model: "gpt-realtime-2.1-mini",
    transcriptionModel: "gpt-4o-mini-transcribe",
    now: () => new Date("2026-09-25T10:00:00.000Z").getTime(),
    onUsage: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    setTimer: (callback: () => void, ms: number) => {
      const timer = { callback, ms };
      timers.push(timer);
      return timer;
    },
  };
  const call = new InterviewCall(session, deps);
  call.attach(sideband);

  return { call, deps, sent, session, sideband, timers };
}

const added = (id: string, role: "user" | "assistant") => ({
  item: { id, role, type: "message" },
  type: "conversation.item.added",
});

const replied = (id: string, transcript: string, status = "completed") => ({
  response: {
    output: [
      {
        content: [{ transcript, type: "output_audio" }],
        id,
        role: "assistant",
        type: "message",
      },
    ],
    status,
    usage: { input_tokens: 100, output_tokens: 20 },
  },
  type: "response.done",
});

const heard = (id: string, transcript: string) => ({
  item_id: id,
  transcript,
  type: "conversation.item.input_audio_transcription.completed",
  usage: { seconds: 6, type: "duration" },
});

describe("InterviewCall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionPrompt.isInterviewOver.mockReturnValue(false);
  });

  it("has the recruiter open a fresh interview", () => {
    const { call, sent } = setup();

    call.open();

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: "response.create" });
    const instructions = (sent[0]!.response as { instructions: string }).instructions;
    expect(instructions).toContain("BRIEF");
    expect(instructions).toContain("Salue le candidat");
  });

  it("replays the conversation on a call that comes back, without a second greeting", () => {
    const { call, sent } = setup(
      makeSession({
        messages: [
          { content: "Bonjour, présentez-vous.", role: "assistant", timestamp: "t" },
          { content: "Je suis développeuse.", role: "user", timestamp: "t" },
        ],
      }),
    );

    call.open();

    expect(sent.map((event) => event.type)).toEqual([
      "conversation.item.create",
      "conversation.item.create",
      "response.create",
    ]);
    expect(sent[1]).toMatchObject({
      item: { content: [{ text: "Je suis développeuse.", type: "input_text" }], role: "user" },
    });
    expect(JSON.stringify(sent[2])).toContain("Ne salue pas");
  });

  it("records the conversation in order, even when a transcript lands late", async () => {
    const { call, deps, session } = setup();

    call.handle(added("a1", "assistant"));
    call.handle(replied("a1", "Parlez-moi de vous."));
    call.handle({ audio_start_ms: 1_000, item_id: "u1", type: "input_audio_buffer.speech_started" });
    call.handle({ audio_end_ms: 7_000, item_id: "u1", type: "input_audio_buffer.speech_stopped" });
    call.handle(added("u1", "user"));
    call.handle(added("a2", "assistant"));
    // The reply is done before the candidate's own words are transcribed.
    call.handle(replied("a2", "Pourquoi ce poste ?"));
    expect(session.messages.map((message) => message.content)).toEqual([
      "Parlez-moi de vous.",
    ]);

    call.handle(heard("u1", "  Je suis  développeuse. "));
    await call.end();

    expect(session.messages.map((m) => [m.role, m.content])).toEqual([
      ["assistant", "Parlez-moi de vous."],
      ["user", "Je suis développeuse."],
      ["assistant", "Pourquoi ce poste ?"],
    ]);
    expect(session.chunks).toHaveLength(1);
    expect(session.chunks[0]).toMatchObject({
      endedAt: "2026-09-25T10:00:07.000Z",
      startedAt: "2026-09-25T10:00:01.000Z",
      status: "transcribed",
      transcript: "Je suis développeuse.",
    });
    expect(deps.save).toHaveBeenCalled();
  });

  it("steers the next reply only when the agenda has moved", () => {
    const { call, sent } = setup();
    call.open();

    // Same brief as the call opened with: resending it would void the cache.
    call.handle(added("a1", "assistant"));
    call.handle(replied("a1", "Bonjour."));
    expect(sent.some((event) => event.type === "session.update")).toBe(false);

    sessionPrompt.buildSessionPrompt.mockReturnValueOnce("NEXT PHASE");
    call.handle(added("a2", "assistant"));
    call.handle(replied("a2", "Parlons de votre parcours."));

    expect(sent.at(-1)).toEqual({
      session: { instructions: "NEXT PHASE", type: "realtime" },
      type: "session.update",
    });
  });

  it("keeps what was already covered fixed for the whole call", () => {
    // Recomputed per reply, it moved with every message past the window and
    // voided the cache on every single reply.
    sessionPrompt.coveredGroundOf.mockReturnValueOnce("Deja aborde: parcours");
    const { call } = setup();
    call.open();

    call.handle(added("a1", "assistant"));
    call.handle(replied("a1", "Bonjour."));
    call.handle(added("a2", "assistant"));
    call.handle(replied("a2", "Et ensuite ?"));

    expect(sessionPrompt.coveredGroundOf).toHaveBeenCalledTimes(1);
    for (const [, covered] of sessionPrompt.buildSessionPrompt.mock.calls) {
      expect(covered).toBe("Deja aborde: parcours");
    }
  });

  it("counts interruptions apart from replies the token ceiling cut", async () => {
    const { call, deps } = setup();

    call.handle(added("a1", "assistant"));
    call.handle(replied("a1", "Pouvez-vous", "cancelled"));
    call.handle(heard("u1", "Oui."));
    call.handle(added("a2", "assistant"));
    const cut = replied("a2", "Parlez-moi de", "incomplete");
    Object.assign(cut.response, { status_details: { reason: "max_output_tokens" } });
    call.handle(cut);

    const summary = await call.end();

    expect(summary).toMatchObject({ interrupted: 1, responses: 2, truncated: 1 });
    expect(summary.usage.inputTokens).toBe(200);
    expect(deps.onUsage).toHaveBeenCalledWith(
      expect.objectContaining({ feature: "interview_voice" }),
    );
    expect(deps.onUsage).toHaveBeenCalledWith(
      expect.objectContaining({ feature: "interview_transcription" }),
    );
  });

  it("does not record the history it replays itself", async () => {
    const { call, session } = setup();

    call.handle(added("hist_0", "assistant"));
    call.handle(added("a1", "assistant"));
    call.handle(replied("a1", "On reprend."));
    await call.end();

    expect(session.messages.map((m) => m.content)).toEqual(["On reprend."]);
  });

  it("hangs up once the goodbye has played", async () => {
    const { call, deps, timers } = setup();
    sessionPrompt.isInterviewOver.mockReturnValue(true);

    call.handle(added("a1", "assistant"));
    call.handle(replied("a1", "Merci, au revoir."));
    expect(deps.hangup).not.toHaveBeenCalled();
    expect(timers.at(-1)!.ms).toBe(CLOSING_GRACE_MS);

    call.handle({ type: "output_audio_buffer.stopped" });
    await vi.waitFor(() => expect(deps.hangup).toHaveBeenCalledTimes(1));

    expect((await call.end()).endedBy).toBe("agenda");
  });

  it("hangs up after the goodbye when the recruiter calls end_interview", async () => {
    // The agenda may not count the interview as over — few, long answers —
    // but the recruiter has said goodbye, and that is what ends it.
    const { call, deps } = setup();

    call.handle(added("a1", "assistant"));
    const goodbye = replied("a1", "Merci, au revoir.");
    goodbye.response.output.push({
      content: [],
      id: "fc1",
      name: "end_interview",
      role: "assistant",
      type: "function_call",
    } as never);
    call.handle(goodbye);
    call.handle({ type: "output_audio_buffer.stopped" });

    await vi.waitFor(() => expect(deps.hangup).toHaveBeenCalledTimes(1));
    expect((await call.end()).endedBy).toBe("agenda");
  });

  it("hangs up at OpenAI too when closed from this side", async () => {
    const { call, deps } = setup();

    expect((await call.close("client")).endedBy).toBe("client");
    expect(deps.hangup).toHaveBeenCalledTimes(1);
  });

  it("hangs up when the paid time plus a grace is spent", async () => {
    const { deps, timers } = setup();

    // Started at 10:00 for ten minutes; the clock reads 10:00.
    expect(timers[0]!.ms).toBe(10 * 60_000 + OVERTIME_GRACE_MS);

    timers[0]!.callback();
    await vi.waitFor(() => expect(deps.hangup).toHaveBeenCalledTimes(1));
  });

  it("writes an answer still being transcribed when the call ends", async () => {
    const { call, session, sideband } = setup();

    call.handle(added("a1", "assistant"));
    call.handle(replied("a1", "Une dernière question ?"));
    call.handle(added("u1", "user"));

    await call.end("client");

    expect(session.chunks).toHaveLength(1);
    expect(session.messages).toHaveLength(1);
    expect(sideband.close).toHaveBeenCalled();
  });
});

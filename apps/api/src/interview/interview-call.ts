import {
  INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
  INTERVIEW_SESSION_STATUS_READY,
} from "@cvforge/types";
import {
  END_INTERVIEW_TOOL,
  type RealtimeServerEvent,
  type RealtimeSideband,
} from "../ai/openai-realtime.service";
import {
  NO_REALTIME_USAGE,
  addUsage,
  priceResponseUsage,
  priceTranscriptionUsage,
  type RealtimeUsage,
} from "../ai/openai-realtime.pricing";
import { buildOpeningInstruction, buildResumeInstruction } from "./interview.prompts";
import { buildSessionPrompt, isInterviewOver } from "./interview.session-prompt";
import {
  appendMessage,
  joinTranscript,
  normalizeTranscript,
  nowIso,
  selectPromptMessages,
} from "./interview.stats";
import type { StoredInterviewSession } from "./interview.types";
import { sortChunks } from "./interview.types";

/**
 * After the goodbye is generated, how long it may take to play before the
 * call is ended anyway. The call normally ends on the playback-stopped event;
 * this only covers a call where that event never comes.
 */
export const CLOSING_GRACE_MS = 15_000;

/** Past the paid duration, how long the recruiter gets to wrap up. */
export const OVERTIME_GRACE_MS = 90_000;

/** Items this server replays into the call itself, which it must not record twice. */
const HISTORY_ITEM_PREFIX = "hist_";

type Item = {
  id: string;
  role: "user" | "assistant";
  /** Null until the words are known: transcribed, or generated. */
  content: string | null;
};

export type InterviewCallDeps = {
  model: string;
  save: (session: StoredInterviewSession) => Promise<unknown>;
  hangup: () => Promise<void>;
  onUsage: (entry: {
    feature: "interview_voice" | "interview_transcription";
    usage: RealtimeUsage;
  }) => void;
  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
};

export type InterviewCallSummary = {
  responses: number;
  /** Cut off because the candidate — or a noise the call took for them — spoke. */
  interrupted: number;
  /** Cut off by the output token ceiling. */
  truncated: number;
  usage: RealtimeUsage;
  endedBy: "agenda" | "overtime" | "client" | "server";
};

/**
 * One live interview call, as the server follows it.
 *
 * The browser talks to OpenAI directly; this sees the same call through the
 * sideband and does what the browser must not: records the conversation for
 * the report, moves the recruiter through its agenda, and hangs up when the
 * interview is over or the time that was paid for is spent.
 *
 * Words arrive out of order — the candidate's transcript often lands after
 * the recruiter has already answered it — so items are held in conversation
 * order and written only once everything before them is known.
 */
export class InterviewCall {
  private sideband: RealtimeSideband | null = null;
  private readonly items: Item[] = [];
  private readonly timing = new Map<string, { startMs?: number; endMs?: number }>();
  private readonly callStartedMs: number;
  private saving: Promise<unknown> = Promise.resolve();
  private usage: RealtimeUsage = NO_REALTIME_USAGE;
  private responses = 0;
  private interrupted = 0;
  private truncated = 0;
  private closing = false;
  private ended = false;
  private endedBy: InterviewCallSummary["endedBy"] = "server";
  /** Why this side is hanging up, set before the hangup echoes back as a close. */
  private hangingUpBy: InterviewCallSummary["endedBy"] | null = null;
  /** What the call was last told, so an unchanged brief is not resent. */
  private instructions: string | null = null;
  private readonly timers: unknown[] = [];
  private readonly now: () => number;
  private readonly setTimer: NonNullable<InterviewCallDeps["setTimer"]>;
  private readonly clearTimer: NonNullable<InterviewCallDeps["clearTimer"]>;

  constructor(
    readonly session: StoredInterviewSession,
    private readonly deps: InterviewCallDeps,
  ) {
    this.now = deps.now ?? Date.now;
    this.setTimer = deps.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
    this.clearTimer =
      deps.clearTimer ?? ((timer) => clearTimeout(timer as NodeJS.Timeout));
    this.callStartedMs = this.now();
    this.scheduleOvertime();
  }

  attach(sideband: RealtimeSideband) {
    this.sideband = sideband;
  }

  /**
   * The sideband is up: the recruiter speaks first. A call that comes back
   * after a drop is handed the conversation so far instead of a greeting.
   */
  open() {
    const instructions = buildSessionPrompt(this.session);
    this.instructions = instructions;

    if (this.session.messages.length === 0) {
      this.send({
        response: {
          instructions: `${instructions}\n\n${buildOpeningInstruction(this.session.language)}`,
        },
        type: "response.create",
      });
      return;
    }

    selectPromptMessages(this.session.messages).forEach((message, index) => {
      this.send({
        item: {
          content: [
            {
              text: message.content,
              type: message.role === "user" ? "input_text" : "output_text",
            },
          ],
          id: `${HISTORY_ITEM_PREFIX}${index}`,
          role: message.role,
          type: "message",
        },
        type: "conversation.item.create",
      });
    });
    this.send({
      response: {
        instructions: `${instructions}\n\n${buildResumeInstruction(this.session.language)}`,
      },
      type: "response.create",
    });
  }

  handle(event: RealtimeServerEvent) {
    if (this.ended) return;

    switch (event.type) {
      case "conversation.item.added":
      case "conversation.item.created":
        this.track(event.item);
        break;

      case "input_audio_buffer.speech_started":
        this.stamp(event.item_id, { startMs: numberOf(event.audio_start_ms) });
        break;

      case "input_audio_buffer.speech_stopped":
        this.stamp(event.item_id, { endMs: numberOf(event.audio_end_ms) });
        break;

      case "conversation.item.input_audio_transcription.completed":
        this.resolve(event.item_id, "user", stringOf(event.transcript));
        this.deps.onUsage({
          feature: "interview_transcription",
          usage: {
            ...NO_REALTIME_USAGE,
            costUsd: priceTranscriptionUsage(event.usage),
          },
        });
        break;

      case "conversation.item.input_audio_transcription.failed":
        // The reply still happened; only the report loses these words.
        this.resolve(event.item_id, "user", "");
        break;

      case "response.done":
        this.onResponseDone(event.response);
        break;

      case "output_audio_buffer.stopped":
        if (this.closing) void this.finish("agenda");
        break;
    }
  }

  /**
   * Winds the call down: whatever is still pending is written as it stands,
   * and the call is hung up if it is not already.
   */
  async end(
    endedBy: InterviewCallSummary["endedBy"] = "server",
  ): Promise<InterviewCallSummary> {
    if (!this.ended) {
      this.ended = true;
      this.endedBy = this.hangingUpBy ?? endedBy;
      for (const timer of this.timers) this.clearTimer(timer);

      for (const item of this.items) item.content ??= "";
      this.flush();
      this.sideband?.close();
    }

    await this.saving;

    return {
      endedBy: this.endedBy,
      interrupted: this.interrupted,
      responses: this.responses,
      truncated: this.truncated,
      usage: this.usage,
    };
  }

  /** Hangs the call up from this side, then winds it down. */
  async close(endedBy: InterviewCallSummary["endedBy"]) {
    await this.finish(endedBy);

    return this.end(endedBy);
  }

  private async finish(endedBy: InterviewCallSummary["endedBy"]) {
    if (this.ended || this.hangingUpBy) return;

    this.hangingUpBy = endedBy;
    await this.deps.hangup();
    await this.end(endedBy);
  }

  private onResponseDone(response: unknown) {
    const body = recordOf(response);
    this.responses += 1;
    if (body.status === "cancelled") this.interrupted += 1;
    if (
      body.status === "incomplete" &&
      recordOf(body.status_details).reason === "max_output_tokens"
    ) {
      this.truncated += 1;
    }

    const usage = priceResponseUsage(this.deps.model, body.usage);
    this.usage = addUsage(this.usage, usage);
    this.deps.onUsage({ feature: "interview_voice", usage });

    let saidGoodbye = false;
    for (const output of arrayOf(body.output)) {
      const item = recordOf(output);
      if (item.type === "function_call" && item.name === END_INTERVIEW_TOOL) {
        saidGoodbye = true;
        continue;
      }
      if (item.type !== "message" || typeof item.id !== "string") continue;

      this.resolve(item.id, "assistant", transcriptOf(item.content));
    }

    // Steered after a reply only when the agenda has actually moved: new
    // instructions void the prompt cache, and the next reply has to re-read
    // the whole conversation before it can speak.
    const instructions = buildSessionPrompt(this.session);
    if (instructions !== this.instructions) {
      this.instructions = instructions;
      this.send({
        session: { instructions, type: "realtime" },
        type: "session.update",
      });
    }

    if (!this.closing && (saidGoodbye || isInterviewOver(this.session))) {
      this.closing = true;
      this.timers.push(
        this.setTimer(() => void this.finish("agenda"), CLOSING_GRACE_MS),
      );
    }
  }

  private track(value: unknown) {
    const item = recordOf(value);
    const id = item.id;
    const role = item.role;

    if (item.type !== "message" || typeof id !== "string") return;
    if (id.startsWith(HISTORY_ITEM_PREFIX)) return;
    if (role !== "user" && role !== "assistant") return;
    if (this.items.some((known) => known.id === id)) return;

    this.items.push({ content: null, id, role });
  }

  private resolve(itemId: unknown, role: Item["role"], text: string) {
    if (typeof itemId !== "string" || itemId.startsWith(HISTORY_ITEM_PREFIX)) {
      return;
    }

    const item = this.items.find((known) => known.id === itemId);
    if (item) {
      item.content = normalizeTranscript(text);
    } else {
      // Never announced: kept rather than lost, at the end of the line.
      this.items.push({ content: normalizeTranscript(text), id: itemId, role });
    }

    this.flush();
  }

  private stamp(itemId: unknown, span: { startMs?: number; endMs?: number }) {
    if (typeof itemId !== "string") return;

    this.timing.set(itemId, { ...this.timing.get(itemId), ...span });
  }

  /** Writes every leading item whose words are known, in conversation order. */
  private flush() {
    let changed = false;

    while (this.items.length > 0 && this.items[0]!.content !== null) {
      const item = this.items.shift()!;
      this.record(item);
      changed = true;
    }

    if (!changed) return;

    const session = this.session;
    this.saving = this.saving
      .then(() => this.deps.save(session))
      .catch(() => undefined);
  }

  private record(item: Item) {
    const timestamp = nowIso();
    const session = this.session;
    const content = item.content ?? "";

    if (item.role === "user") {
      const span = this.timing.get(item.id);
      session.chunks = sortChunks([
        ...session.chunks,
        {
          chunkId: `${session.id}-${item.id}`,
          createdAt: timestamp,
          endedAt: this.at(span?.endMs) ?? timestamp,
          errorMessage: null,
          isFinal: false,
          mimeType: "audio/webrtc",
          sequence: session.chunks.length + 1,
          startedAt: this.at(span?.startMs) ?? timestamp,
          status: INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
          transcript: content,
        },
      ]);
    }

    if (content) {
      session.messages = appendMessage(session.messages, {
        content,
        role: item.role,
        timestamp,
      });
    }

    session.transcript = joinTranscript(session);
    session.lastError = null;
    session.recoverable = true;
    session.status = INTERVIEW_SESSION_STATUS_READY;
    session.updatedAt = timestamp;
    session.startedAt ??= timestamp;
  }

  /** Offsets are counted on the call's own audio clock, from when it opened. */
  private at(offsetMs: number | undefined): string | null {
    return offsetMs === undefined
      ? null
      : new Date(this.callStartedMs + offsetMs).toISOString();
  }

  private scheduleOvertime() {
    const startedMs = this.session.startedAt
      ? new Date(this.session.startedAt).getTime()
      : this.callStartedMs;
    const deadlineMs =
      startedMs + this.session.durationMinutes * 60_000 + OVERTIME_GRACE_MS;

    this.timers.push(
      this.setTimer(
        () => void this.finish("overtime"),
        Math.max(0, deadlineMs - this.now()),
      ),
    );
  }

  private send(event: Record<string, unknown>) {
    this.sideband?.send(event);
  }
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberOf(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** What the recruiter said: the audio's transcript, or plain text. */
function transcriptOf(content: unknown): string {
  return arrayOf(content)
    .map((part) => {
      const piece = recordOf(part);
      return stringOf(piece.transcript) || stringOf(piece.text);
    })
    .join(" ");
}

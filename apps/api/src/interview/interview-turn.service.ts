import {
  INTERVIEW_CHUNK_STATUS_FAILED,
  INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
  INTERVIEW_SESSION_STATUS_ERROR,
  INTERVIEW_SESSION_STATUS_READY,
  type InterviewTranscriptionChunkRequest,
  type InterviewTurnEvent,
} from "@cvforge/types";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { OpenRouterTranscriptionService } from "../ai/openrouter-transcription.service";
import type { OpenRouterVoiceService } from "../ai/openrouter-voice.service";
import { buildAiPrompt } from "./interview.prompts";
import {
  MAX_MESSAGES,
  appendMessage,
  joinTranscript,
  normalizeTranscript,
  nowIso,
} from "./interview.stats";
import type { InterviewStore, StoredInterviewSession } from "./interview.types";
import { sortChunks, summarizeInterviewSession } from "./interview.types";

/**
 * Runs one spoken turn: the candidate's answer in, the interviewer's voice out.
 *
 * Two calls go out at once. The speech-to-speech model answers the audio
 * directly — that is what the candidate hears, and it starts speaking in about
 * a second. Transcription runs alongside purely to record what the candidate
 * said, because the report is built from their words (hesitations, keyword
 * coverage, pacing). Running it in sequence would add its own latency to every
 * turn for a result nobody is waiting on.
 */
@Injectable()
export class InterviewTurnService {
  constructor(
    private readonly store: InterviewStore,
    private readonly voice: OpenRouterVoiceService,
    private readonly transcription: OpenRouterTranscriptionService,
  ) {}

  private readonly logger = new Logger(InterviewTurnService.name);

  async *streamTurn(
    userEmail: string,
    sessionId: string,
    request: InterviewTranscriptionChunkRequest,
  ): AsyncGenerator<InterviewTurnEvent, void, undefined> {
    const session = await this.store.findByIdForUserEmail(userEmail, sessionId);
    if (!session) throw new NotFoundException("Session d'interview introuvable.");

    // Already handled: replaying it would charge for the turn twice.
    if (session.chunks.some((chunk) => chunk.chunkId === request.chunkId)) {
      yield { type: "done" };
      return;
    }

    const transcribing = this.transcribeAside(request);
    let candidateText: string | null = null;
    let emittedCandidate = false;
    let reply = "";

    try {
      for await (const event of this.voice.streamTurn({
        audioBase64: request.chunkBase64,
        format: request.format,
        history: session.messages.slice(-MAX_MESSAGES).map((message) => ({
          content: message.content,
          role: message.role,
        })),
        systemPrompt: buildAiPrompt(session.language, session.profile),
      })) {
        if (event.type === "audio") {
          yield { type: "audio", data: event.data };
        } else {
          reply += event.text;
          yield { type: "reply", text: event.text };
        }

        // Surfaced as soon as it is ready, between two audio frames, so the
        // candidate's own words appear without holding the voice back.
        candidateText ??= transcribing.settled;
        if (candidateText !== null && !emittedCandidate) {
          emittedCandidate = true;
          yield { type: "candidate", text: candidateText };
        }
      }
    } catch (error) {
      const message = describe(error, "Le recruteur n'a pas pu repondre.");
      await this.recordFailure(session, request, message);
      yield { type: "error", message };
      return;
    }

    const transcript = (await transcribing.promise) ?? "";
    if (!emittedCandidate) yield { type: "candidate", text: transcript };

    await this.recordTurn(session, request, transcript, reply.trim());

    yield { type: "done" };
  }

  /**
   * Starts transcription immediately and exposes its result both as a promise
   * and as a plain value once settled, so the streaming loop can pick it up
   * without awaiting.
   */
  private transcribeAside(request: InterviewTranscriptionChunkRequest) {
    const state: { promise: Promise<string | null>; settled: string | null } = {
      promise: Promise.resolve(null),
      settled: null,
    };

    state.promise = this.transcription
      .transcribe({
        audioBase64: request.chunkBase64,
        format: request.format,
        language: undefined,
      })
      .then((text) => {
        state.settled = normalizeTranscript(text);
        return state.settled;
      })
      .catch((error: unknown) => {
        // The turn still works without it; only the report loses detail.
        this.logger.warn(
          `Interview transcription failed for ${request.chunkId}: ${describe(
            error,
            "unknown",
          )}`,
        );
        return null;
      });

    return state;
  }

  private async recordTurn(
    session: StoredInterviewSession,
    request: InterviewTranscriptionChunkRequest,
    transcript: string,
    reply: string,
  ) {
    const timestamp = nowIso();

    session.chunks = sortChunks([
      ...session.chunks,
      {
        chunkId: request.chunkId,
        createdAt: timestamp,
        endedAt: request.endedAt,
        errorMessage: null,
        isFinal: request.isFinal,
        mimeType: request.mimeType,
        sequence: request.sequence,
        startedAt: request.startedAt,
        status: INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
        transcript,
      },
    ]);

    if (transcript) {
      session.messages = appendMessage(session.messages, {
        content: transcript,
        role: "user",
        timestamp,
      });
    }

    if (reply) {
      session.messages = appendMessage(session.messages, {
        content: reply,
        role: "assistant",
        timestamp,
      });
    }

    session.transcript = joinTranscript(session);
    session.lastError = null;
    session.recoverable = true;
    session.status = INTERVIEW_SESSION_STATUS_READY;
    session.updatedAt = timestamp;

    await this.store.save(session);
  }

  private async recordFailure(
    session: StoredInterviewSession,
    request: InterviewTranscriptionChunkRequest,
    message: string,
  ) {
    const timestamp = nowIso();

    session.chunks = sortChunks([
      ...session.chunks,
      {
        chunkId: request.chunkId,
        createdAt: timestamp,
        endedAt: request.endedAt,
        errorMessage: message,
        isFinal: request.isFinal,
        mimeType: request.mimeType,
        sequence: request.sequence,
        startedAt: request.startedAt,
        status: INTERVIEW_CHUNK_STATUS_FAILED,
        transcript: "",
      },
    ]);
    session.lastError = message;
    // The session survives: the candidate can simply speak again.
    session.recoverable = true;
    session.status = INTERVIEW_SESSION_STATUS_ERROR;
    session.updatedAt = timestamp;

    await this.store.save(session);
  }

  /** Summarises the session the way the REST endpoints do. */
  async readSession(userEmail: string, sessionId: string) {
    const session = await this.store.findByIdForUserEmail(userEmail, sessionId);
    if (!session) throw new NotFoundException("Session d'interview introuvable.");

    return summarizeInterviewSession(session);
  }
}

function describe(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

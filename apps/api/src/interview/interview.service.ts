import {
  INTERVIEW_CHUNK_STATUS_FAILED,
  INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
  INTERVIEW_SESSION_STATUS_ERROR,
  INTERVIEW_SESSION_STATUS_IDLE,
  INTERVIEW_SESSION_STATUS_READY,
  INTERVIEW_SESSION_STATUS_RECORDING,
  type InterviewTranscriptionChunkRequest,
} from "@cvforge/types";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { InterviewStore, StoredInterviewSession } from "./interview.types";
import { sortChunks, summarizeInterviewSession } from "./interview.types";

const VOXTRAL_SMALL_MODEL = "mistralai/voxtral-small-24b-2507";

const STT_PROMPT = [
  "Transcribe this audio chunk faithfully.",
  "Return plain text only.",
  "Keep hesitations when they help the sentence meaning.",
  "Do not add speaker labels, timestamps, or commentary.",
].join(" ");

function nowIso() {
  return new Date().toISOString();
}

function normalizeTranscript(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function joinTranscript(session: StoredInterviewSession) {
  return sortChunks(session.chunks)
    .filter((chunk) => chunk.status === INTERVIEW_CHUNK_STATUS_TRANSCRIBED)
    .map((chunk) => chunk.transcript)
    .filter((chunk) => chunk.length > 0)
    .join(" ")
    .trim();
}

@Injectable()
export class InterviewService {
  constructor(
    private readonly store: InterviewStore,
    private readonly openRouter: OpenRouterService,
  ) {}

  startSession(userEmail: string) {
    const createdAt = nowIso();
    const session: StoredInterviewSession = {
      chunks: [],
      createdAt,
      id: `interview_${Date.now().toString(36)}`,
      lastError: null,
      recoverable: true,
      status: INTERVIEW_SESSION_STATUS_IDLE,
      transcript: "",
      updatedAt: createdAt,
      userEmail,
    };

    this.store.save(session);

    return {
      session: summarizeInterviewSession(session),
      sessionId: session.id,
    };
  }

  getSession(userEmail: string, sessionId: string) {
    return summarizeInterviewSession(this.getOwnedSession(userEmail, sessionId));
  }

  async transcribeChunk(
    userEmail: string,
    sessionId: string,
    request: InterviewTranscriptionChunkRequest,
  ) {
    const session = this.getOwnedSession(userEmail, sessionId);
    const existingChunk = session.chunks.find(
      (chunk) => chunk.chunkId === request.chunkId,
    );

    if (existingChunk) {
      return summarizeInterviewSession(session);
    }

    try {
      const transcript = normalizeTranscript(
        await this.openRouter.transcribeAudio(
          request.chunkBase64,
          request.format,
          STT_PROMPT,
          { model: VOXTRAL_SMALL_MODEL },
        ),
      );

      session.chunks = sortChunks([
        ...session.chunks,
        {
          chunkId: request.chunkId,
          createdAt: nowIso(),
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
      session.lastError = null;
      session.recoverable = true;
      session.status = request.isFinal
        ? INTERVIEW_SESSION_STATUS_READY
        : INTERVIEW_SESSION_STATUS_RECORDING;
      session.transcript = joinTranscript(session);
      session.updatedAt = nowIso();
      this.store.save(session);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "La transcription Voxtral a echoue.";

      session.chunks = sortChunks([
        ...session.chunks,
        {
          chunkId: request.chunkId,
          createdAt: nowIso(),
          endedAt: request.endedAt,
          errorMessage,
          isFinal: request.isFinal,
          mimeType: request.mimeType,
          sequence: request.sequence,
          startedAt: request.startedAt,
          status: INTERVIEW_CHUNK_STATUS_FAILED,
          transcript: "",
        },
      ]);
      session.lastError = errorMessage;
      session.recoverable = true;
      session.status = INTERVIEW_SESSION_STATUS_ERROR;
      session.updatedAt = nowIso();
      this.store.save(session);
    }

    return summarizeInterviewSession(session);
  }

  private getOwnedSession(userEmail: string, sessionId: string) {
    const session = this.store.findByIdForUserEmail(userEmail, sessionId);

    if (!session) {
      throw new NotFoundException("Session d'interview introuvable.");
    }

    return session;
  }
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  INTERVIEW_AI_STATUS_IDLE,
  INTERVIEW_SESSION_STATUS_IDLE,
  type Locale,
  type InterviewTranscriptChunk,
} from "@cvforge/types";
import type { InterviewStore, StoredInterviewSession } from "./interview.types";
import { sortChunks } from "./interview.types";

type PersistedInterviewState = {
  sessions: Record<string, StoredInterviewSession>;
};

function createEmptyState(): PersistedInterviewState {
  return {
    sessions: {},
  };
}

function normalizeChunks(value: unknown): InterviewTranscriptChunk[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return sortChunks(
    value
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const chunk = entry as Record<string, unknown>;
        return {
          chunkId: typeof chunk.chunkId === "string" ? chunk.chunkId : "",
          createdAt:
            typeof chunk.createdAt === "string" ? chunk.createdAt : new Date(0).toISOString(),
          endedAt: typeof chunk.endedAt === "string" ? chunk.endedAt : new Date(0).toISOString(),
          errorMessage:
            typeof chunk.errorMessage === "string" ? chunk.errorMessage : null,
          isFinal: Boolean(chunk.isFinal),
          mimeType: typeof chunk.mimeType === "string" ? chunk.mimeType : "audio/webm",
          sequence: typeof chunk.sequence === "number" ? chunk.sequence : 0,
          startedAt:
            typeof chunk.startedAt === "string" ? chunk.startedAt : new Date(0).toISOString(),
          status:
            chunk.status === "failed" ? "failed" : "transcribed",
          transcript: typeof chunk.transcript === "string" ? chunk.transcript : "",
        };
      })
      .filter((chunk): chunk is InterviewTranscriptChunk => chunk !== null),
  );
}

function normalizeSession(session: StoredInterviewSession): StoredInterviewSession {
  const language = session.language === "en" ? "en" : "fr";
  return {
    ...session,
    aiResponse: typeof session.aiResponse === "string" ? session.aiResponse : null,
    aiResponseGeneratedAt:
      typeof session.aiResponseGeneratedAt === "string"
        ? session.aiResponseGeneratedAt
        : null,
    aiStatus: session.aiStatus ?? INTERVIEW_AI_STATUS_IDLE,
    chunks: normalizeChunks(session.chunks),
    language: language as Locale,
    lastError: session.lastError ?? null,
    recoverable: session.recoverable ?? true,
    status: session.status ?? INTERVIEW_SESSION_STATUS_IDLE,
    transcript: typeof session.transcript === "string" ? session.transcript : "",
  };
}

export class FileInterviewStore implements InterviewStore {
  constructor(private readonly stateFilePath: string) {}

  findById(sessionId: string) {
    const state = this.readState();
    return state.sessions[sessionId] ?? null;
  }

  findByIdForUserEmail(userEmail: string, sessionId: string) {
    const session = this.findById(sessionId);

    if (!session || session.userEmail !== userEmail) {
      return null;
    }

    return session;
  }

  save(session: StoredInterviewSession) {
    const state = this.readState();
    state.sessions[session.id] = normalizeSession(session);
    this.writeState(state);
    return session;
  }

  private readState(): PersistedInterviewState {
    if (!existsSync(this.stateFilePath)) {
      return createEmptyState();
    }

    try {
      const parsed = JSON.parse(
        readFileSync(this.stateFilePath, "utf8"),
      ) as Partial<PersistedInterviewState>;

      return {
        sessions: Object.fromEntries(
          Object.entries(parsed.sessions ?? {}).map(([id, session]) => [
            id,
            normalizeSession(session as StoredInterviewSession),
          ]),
        ),
      };
    } catch {
      return createEmptyState();
    }
  }

  private writeState(state: PersistedInterviewState) {
    mkdirSync(dirname(this.stateFilePath), { recursive: true });
    writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
  }
}

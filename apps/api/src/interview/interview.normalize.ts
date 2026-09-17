import {
  INTERVIEW_AI_STATUS_IDLE,
  INTERVIEW_PROFILE_STANDARD,
  INTERVIEW_SESSION_STATUS_COMPLETED,
  INTERVIEW_SESSION_STATUS_IDLE,
  type Locale,
  type InterviewRecruiterProfile,
  type InterviewTranscriptChunk,
} from "@cvforge/types";
import type { StoredInterviewSession } from "./interview.types";
import {
  normalizeInterviewReport,
  normalizeMessages,
  sortChunks,
} from "./interview.types";

/**
 * The repairs the JSON store used to apply on every read. Legacy records on
 * disk are only valid because of them, and the Postgres columns are
 * `not null`, so `import-legacy-interviews` runs them before inserting.
 */
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

export function normalizeSession(session: StoredInterviewSession): StoredInterviewSession {
  const language = session.language === "en" ? "en" : "fr";
  const profile = normalizeProfile(session.profile);
  return {
    ...session,
    applicationId:
      typeof session.applicationId === "string" ? session.applicationId : null,
    aiResponse: typeof session.aiResponse === "string" ? session.aiResponse : null,
    aiResponseGeneratedAt:
      typeof session.aiResponseGeneratedAt === "string"
        ? session.aiResponseGeneratedAt
        : null,
    aiStatus: session.aiStatus ?? INTERVIEW_AI_STATUS_IDLE,
    chunks: normalizeChunks(session.chunks),
    completedAt:
      typeof session.completedAt === "string" ? session.completedAt : null,
    language: language as Locale,
    lastError: session.lastError ?? null,
    messages: normalizeMessages(session.messages),
    prefetchedQuestion:
      typeof session.prefetchedQuestion === "string"
        ? session.prefetchedQuestion
        : null,
    profile,
    report: normalizeInterviewReport(session.report),
    recoverable: session.recoverable ?? true,
    status: normalizeStatus(session.status),
    transcript: typeof session.transcript === "string" ? session.transcript : "",
  };
}

function normalizeProfile(value: unknown): InterviewRecruiterProfile {
  switch (value) {
    case "aggressive":
    case "passive":
    case "technical":
    case "behavioral":
    case "standard":
      return value;
    default:
      return INTERVIEW_PROFILE_STANDARD;
  }
}

function normalizeStatus(value: unknown) {
  switch (value) {
    case "recording":
    case "ready":
    case INTERVIEW_SESSION_STATUS_COMPLETED:
    case "error":
      return value;
    default:
      return INTERVIEW_SESSION_STATUS_IDLE;
  }
}

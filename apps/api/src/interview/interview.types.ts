import type {
  InterviewSessionSummary,
  InterviewTranscriptChunk,
} from "@cvforge/types";

export type StoredInterviewSession = InterviewSessionSummary & {
  userEmail: string;
};

export type InterviewStore = {
  findById: (sessionId: string) => StoredInterviewSession | null;
  findByIdForUserEmail: (
    userEmail: string,
    sessionId: string,
  ) => StoredInterviewSession | null;
  save: (session: StoredInterviewSession) => StoredInterviewSession;
};

export function summarizeInterviewSession(
  session: StoredInterviewSession,
): InterviewSessionSummary {
  return {
    aiResponse: session.aiResponse,
    aiResponseGeneratedAt: session.aiResponseGeneratedAt,
    aiStatus: session.aiStatus,
    chunks: session.chunks,
    createdAt: session.createdAt,
    id: session.id,
    language: session.language,
    lastError: session.lastError,
    recoverable: session.recoverable,
    status: session.status,
    transcript: session.transcript,
    updatedAt: session.updatedAt,
  };
}

export function sortChunks(
  chunks: InterviewTranscriptChunk[],
): InterviewTranscriptChunk[] {
  return [...chunks].sort((left, right) => left.sequence - right.sequence);
}

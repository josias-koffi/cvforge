import type {
  InterviewReport,
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
    applicationId: session.applicationId,
    aiResponse: session.aiResponse,
    aiResponseGeneratedAt: session.aiResponseGeneratedAt,
    aiStatus: session.aiStatus,
    chunks: session.chunks,
    completedAt: session.completedAt,
    createdAt: session.createdAt,
    id: session.id,
    language: session.language,
    lastError: session.lastError,
    profile: session.profile,
    report: session.report,
    recoverable: session.recoverable,
    status: session.status,
    transcript: session.transcript,
    updatedAt: session.updatedAt,
  };
}

export function normalizeInterviewReport(
  report: InterviewReport | null | undefined,
): InterviewReport | null {
  if (!report) {
    return null;
  }

  return {
    createdAt: report.createdAt,
    improvements: report.improvements,
    metrics: report.metrics.map((metric) => ({
      detail: metric.detail,
      key: metric.key,
      label: metric.label,
      score: metric.score,
    })),
    overallScore: report.overallScore,
    summary: report.summary,
    transcriptStats: {
      averageResponseDurationSeconds:
        report.transcriptStats.averageResponseDurationSeconds,
      hesitationCount: report.transcriptStats.hesitationCount,
      keywordCoverage: report.transcriptStats.keywordCoverage,
      keywordMentions: report.transcriptStats.keywordMentions,
      responseCount: report.transcriptStats.responseCount,
    },
  };
}

export function sortChunks(
  chunks: InterviewTranscriptChunk[],
): InterviewTranscriptChunk[] {
  return [...chunks].sort((left, right) => left.sequence - right.sequence);
}

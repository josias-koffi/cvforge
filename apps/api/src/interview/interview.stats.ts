import {
  INTERVIEW_CHUNK_STATUS_TRANSCRIBED,
  type InterviewMessage,
  type InterviewTranscriptStats,
} from "@cvforge/types";
import type { StoredApplication } from "../applications/applications.types";
import type { StoredInterviewSession } from "./interview.types";
import { sortChunks } from "./interview.types";

/** How many turns of context the interviewer model is given. */
export const MAX_MESSAGES = 20;

const HESITATION_TOKENS = ["euh", "heu", "hum", "uh", "um", "erm"] as const;

export function nowIso() {
  return new Date().toISOString();
}

export function appendMessage(
  messages: InterviewMessage[],
  msg: InterviewMessage,
): InterviewMessage[] {
  const updated = [...messages, msg];
  if (updated.length <= MAX_MESSAGES) {
    return updated;
  }
  // Drop the oldest user+assistant pair to stay within context budget
  return updated.slice(updated.length - MAX_MESSAGES);
}

export function normalizeTranscript(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function joinTranscript(session: StoredInterviewSession) {
  return sortChunks(session.chunks)
    .filter((chunk) => chunk.status === INTERVIEW_CHUNK_STATUS_TRANSCRIBED)
    .map((chunk) => chunk.transcript)
    .filter((chunk) => chunk.length > 0)
    .join(" ")
    .trim();
}

/** Accent- and case-insensitive, punctuation stripped, so "Éthique" matches "ethique". */
function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
}

/** Tokens of four characters or more, deduplicated — short words carry no signal. */
export function extractKeywords(values: Array<string | null | undefined>) {
  return [
    ...new Set(
      values
        .flatMap((value) => normalizeToken(value ?? "").split(/\s+/))
        .map((token) => token.trim())
        .filter((token) => token.length >= 4),
    ),
  ];
}

export function countHesitations(transcript: string) {
  const normalized = normalizeToken(transcript);

  return HESITATION_TOKENS.reduce(
    (count, token) =>
      count + (normalized.match(new RegExp(`\\b${token}\\b`, "g"))?.length ?? 0),
    0,
  );
}

/** Null when no chunk carries a usable span, rather than a misleading zero. */
export function averageChunkDurationSeconds(
  chunks: StoredInterviewSession["chunks"],
) {
  const durations = chunks
    .map((chunk) => {
      const startedAt = new Date(chunk.startedAt).getTime();
      const endedAt = new Date(chunk.endedAt).getTime();

      if (
        !Number.isFinite(startedAt) ||
        !Number.isFinite(endedAt) ||
        endedAt <= startedAt
      ) {
        return null;
      }

      return (endedAt - startedAt) / 1000;
    })
    .filter((value): value is number => value !== null);

  if (durations.length === 0) {
    return null;
  }

  return Math.round(
    durations.reduce((sum, value) => sum + value, 0) / durations.length,
  );
}

/**
 * Coverage is measured against the linked offer: with no application to
 * compare to, it is 0 rather than a flattering 100.
 */
export function buildTranscriptStats(
  session: StoredInterviewSession,
  application: StoredApplication | null,
): InterviewTranscriptStats {
  const keywords = application
    ? extractKeywords([
        application.extracted.title,
        application.extracted.summary,
        application.extracted.companyName,
        ...application.extracted.requirements,
        ...application.extracted.responsibilities,
      ])
    : [];
  const transcriptKeywords = new Set(extractKeywords([session.transcript]));
  const keywordMentions = keywords.filter((keyword) =>
    transcriptKeywords.has(keyword),
  );

  return {
    averageResponseDurationSeconds: averageChunkDurationSeconds(session.chunks),
    hesitationCount: countHesitations(session.transcript),
    keywordCoverage:
      keywords.length === 0
        ? 0
        : Math.round((keywordMentions.length / keywords.length) * 100),
    keywordMentions,
    responseCount: session.chunks.length,
  };
}

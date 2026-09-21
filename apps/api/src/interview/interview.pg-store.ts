import {
  INTERVIEW_DEFAULT_DURATION_MINUTES,
  type InterviewTranscriptChunk,
} from "@cvforge/types";
import { and, asc, desc, eq, lt } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { applications, interviewChunks, interviewSessions } from "../database/schema";
import type { InterviewStore, StoredInterviewSession } from "./interview.types";

/** One page of history; the UI shows a handful at a time. */
const DEFAULT_LIST_LIMIT = 20;

type SessionRow = typeof interviewSessions.$inferSelect;
type ChunkRow = typeof interviewChunks.$inferSelect;

function toChunk(row: ChunkRow): InterviewTranscriptChunk {
  return {
    chunkId: row.chunkId,
    createdAt: row.createdAt.toISOString(),
    endedAt: row.endedAt.toISOString(),
    errorMessage: row.errorMessage,
    isFinal: row.isFinal,
    mimeType: row.mimeType,
    sequence: row.sequence,
    startedAt: row.startedAt.toISOString(),
    status: row.status,
    transcript: row.transcript,
  };
}

function toSession(
  row: SessionRow,
  chunks: InterviewTranscriptChunk[],
): StoredInterviewSession {
  return {
    aiResponse: row.aiResponse,
    aiResponseGeneratedAt: row.aiResponseGeneratedAt?.toISOString() ?? null,
    aiStatus: row.aiStatus,
    applicationId: row.applicationId,
    chunks,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    language: row.language,
    lastError: row.lastError,
    messages: row.messages,
    prefetchedQuestion: row.prefetchedQuestion,
    profile: row.profile,
    recoverable: row.recoverable,
    report: row.report ?? null,
    status: row.status,
    transcript: row.transcript,
    updatedAt: row.updatedAt.toISOString(),
    userEmail: row.userEmail,
    durationMinutes: row.durationMinutes,
    startedAt: row.startedAt?.toISOString() ?? null,
    context: row.context ?? null,
  };
}

function toRow(session: StoredInterviewSession) {
  return {
    aiResponse: session.aiResponse,
    aiResponseGeneratedAt: session.aiResponseGeneratedAt
      ? new Date(session.aiResponseGeneratedAt)
      : null,
    aiStatus: session.aiStatus,
    applicationId: session.applicationId,
    completedAt: session.completedAt ? new Date(session.completedAt) : null,
    createdAt: new Date(session.createdAt),
    id: session.id,
    language: session.language,
    lastError: session.lastError,
    messages: session.messages ?? [],
    prefetchedQuestion: session.prefetchedQuestion ?? null,
    profile: session.profile,
    recoverable: session.recoverable,
    report: session.report ?? null,
    status: session.status,
    transcript: session.transcript ?? "",
    updatedAt: new Date(session.updatedAt),
    userEmail: session.userEmail,
    durationMinutes:
      session.durationMinutes ?? INTERVIEW_DEFAULT_DURATION_MINUTES,
    startedAt: session.startedAt ? new Date(session.startedAt) : null,
    context: session.context ?? null,
  };
}

export class PgInterviewStore implements InterviewStore {
  constructor(private readonly db: Database) {}

  async findById(sessionId: string) {
    const [row] = await this.db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.id, sessionId));

    return row ? toSession(row, await this.readChunks(sessionId)) : null;
  }

  async findByIdForUserEmail(userEmail: string, sessionId: string) {
    const [row] = await this.db
      .select()
      .from(interviewSessions)
      .where(
        and(
          eq(interviewSessions.id, sessionId),
          eq(interviewSessions.userEmail, userEmail),
        ),
      );

    return row ? toSession(row, await this.readChunks(sessionId)) : null;
  }

  /**
   * Writes the session and replaces its chunks. The caller hands over the full
   * run every time, as it did when this was one JSON blob, so the rows are
   * deleted and re-inserted inside one transaction.
   */
  save(session: StoredInterviewSession) {
    const row = toRow(session);

    return this.db.transaction(async (tx) => {
      await tx
        .insert(interviewSessions)
        .values(row)
        .onConflictDoUpdate({ target: interviewSessions.id, set: row });

      await tx
        .delete(interviewChunks)
        .where(eq(interviewChunks.sessionId, session.id));

      for (const chunk of session.chunks ?? []) {
        await tx.insert(interviewChunks).values({
          chunkId: chunk.chunkId,
          createdAt: new Date(chunk.createdAt),
          endedAt: new Date(chunk.endedAt),
          errorMessage: chunk.errorMessage,
          isFinal: chunk.isFinal,
          mimeType: chunk.mimeType,
          sequence: chunk.sequence,
          sessionId: session.id,
          startedAt: new Date(chunk.startedAt),
          status: chunk.status,
          transcript: chunk.transcript,
        });
      }

      return session;
    });
  }

  /**
   * The session history, newest first. Reads named columns and never touches
   * `interview_chunks`: a twenty-row page would otherwise pull every audio
   * segment the user ever recorded. `responseCount` comes from the stored
   * report, which already counted them.
   */
  async listByUserEmail(userEmail: string, options: { limit?: number } = {}) {
    const rows = await this.db
      .select({
        applicationId: interviewSessions.applicationId,
        applicationExtracted: applications.extracted,
        completedAt: interviewSessions.completedAt,
        createdAt: interviewSessions.createdAt,
        id: interviewSessions.id,
        language: interviewSessions.language,
        profile: interviewSessions.profile,
        report: interviewSessions.report,
        status: interviewSessions.status,
      })
      .from(interviewSessions)
      .leftJoin(applications, eq(applications.id, interviewSessions.applicationId))
      .where(eq(interviewSessions.userEmail, userEmail))
      .orderBy(desc(interviewSessions.createdAt))
      .limit(options.limit ?? DEFAULT_LIST_LIMIT);

    return rows.map((row) => ({
      applicationId: row.applicationId,
      applicationTitle: row.applicationExtracted?.title ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      language: row.language,
      overallScore: row.report?.overallScore ?? null,
      profile: row.profile,
      report: row.report ?? null,
      responseCount: row.report?.transcriptStats.responseCount ?? 0,
      status: row.status,
    }));
  }

  /** Retention purge; the chunks cascade with their session. */
  /** Chunks go with the session: the foreign key cascades on delete. */
  async deleteByUserEmail(userEmail: string) {
    const rows = await this.db
      .delete(interviewSessions)
      .where(eq(interviewSessions.userEmail, userEmail))
      .returning({ id: interviewSessions.id });

    return rows.length;
  }

  async purgeCompletedBefore(cutoffIso: string) {
    const purged = await this.db
      .delete(interviewSessions)
      .where(lt(interviewSessions.completedAt, new Date(cutoffIso)))
      .returning({ id: interviewSessions.id });

    return purged.length;
  }

  private async readChunks(sessionId: string) {
    const rows = await this.db
      .select()
      .from(interviewChunks)
      .where(eq(interviewChunks.sessionId, sessionId))
      .orderBy(asc(interviewChunks.sequence));

    return rows.map(toChunk);
  }
}

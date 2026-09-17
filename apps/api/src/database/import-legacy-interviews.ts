import { existsSync, readFileSync } from "node:fs";
import { normalizeSession } from "../interview/interview.normalize";
import type { StoredInterviewSession } from "../interview/interview.types";
import type { Database } from "./database.types";
import { dataImports, interviewChunks, interviewSessions } from "./schema";

export const LEGACY_INTERVIEWS_IMPORT = "interviews-state.json";

export type LegacyInterviewsImportResult =
  | { status: "already_imported" }
  | { status: "imported"; sessions: number; chunks: number; skipped: number };

function readLegacySessions(filePath: string): StoredInterviewSession[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
    sessions?: Record<string, StoredInterviewSession>;
  };

  return Object.values(parsed.sessions ?? {});
}

/**
 * Copies the JSON interview sessions into Postgres once per environment,
 * oldest first, with each session's transcript chunks.
 *
 * Every record goes through the store's own read-time repairs: `status`,
 * `profile`, `messages` and each chunk's fields were patched on read, and the
 * columns here are `not null`.
 *
 * A session with no `id` or `userEmail` cannot be attributed to anyone and is
 * counted as skipped; the count is logged so the row totals can be compared
 * against the file.
 *
 * A missing file is recorded as imported too: there is nothing left to copy.
 */
export async function importLegacyInterviews(
  db: Database,
  filePath: string,
): Promise<LegacyInterviewsImportResult> {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .insert(dataImports)
      .values({ name: LEGACY_INTERVIEWS_IMPORT })
      .onConflictDoNothing()
      .returning({ name: dataImports.name });

    if (claimed.length === 0) {
      return { status: "already_imported" };
    }

    const legacy = readLegacySessions(filePath).sort((left, right) =>
      (left?.createdAt ?? "").localeCompare(right?.createdAt ?? ""),
    );

    let sessions = 0;
    let chunks = 0;
    let skipped = 0;

    for (const raw of legacy) {
      if (!raw?.id || !raw.userEmail) {
        skipped += 1;
        continue;
      }

      const session = normalizeSession(raw);

      const inserted = await tx
        .insert(interviewSessions)
        .values({
          aiResponse: session.aiResponse,
          aiResponseGeneratedAt: session.aiResponseGeneratedAt
            ? new Date(session.aiResponseGeneratedAt)
            : null,
          aiStatus: session.aiStatus,
          applicationId: session.applicationId,
          completedAt: session.completedAt
            ? new Date(session.completedAt)
            : null,
          createdAt: new Date(session.createdAt),
          id: session.id,
          language: session.language,
          lastError: session.lastError,
          messages: session.messages,
          prefetchedQuestion: session.prefetchedQuestion ?? null,
          profile: session.profile,
          recoverable: session.recoverable,
          report: session.report,
          status: session.status,
          transcript: session.transcript,
          updatedAt: new Date(session.updatedAt),
          userEmail: session.userEmail,
        })
        .onConflictDoNothing()
        .returning({ id: interviewSessions.id });

      if (inserted.length === 0) {
        continue;
      }

      sessions += 1;

      for (const chunk of session.chunks) {
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
        chunks += 1;
      }
    }

    return { status: "imported", sessions, chunks, skipped };
  });
}

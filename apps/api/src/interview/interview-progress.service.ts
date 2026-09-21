import type {
  InterviewProgressSummary,
  InterviewSessionListItem,
} from "@cvforge/types";
import { Injectable } from "@nestjs/common";
import {
  PROGRESS_WINDOW,
  aggregateInterviewProgress,
  type ScoredSession,
} from "./interview.progress";
import type { InterviewSessionListRow, InterviewStore } from "./interview.types";

/** Enough history to see a trend without turning the page into an archive. */
const HISTORY_LIMIT = 20;

function toListItem(row: InterviewSessionListRow): InterviewSessionListItem {
  return {
    applicationId: row.applicationId,
    applicationTitle: row.applicationTitle,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    id: row.id,
    language: row.language,
    overallScore: row.overallScore,
    profile: row.profile,
    responseCount: row.responseCount,
    status: row.status,
  };
}

/** A session counts towards progress only once it is finished and scored. */
function toScored(row: InterviewSessionListRow): ScoredSession | null {
  return row.completedAt && row.report
    ? { completedAt: row.completedAt, report: row.report }
    : null;
}

@Injectable()
export class InterviewProgressService {
  constructor(private readonly store: InterviewStore) {}

  async list(userEmail: string, limit = HISTORY_LIMIT) {
    const rows = await this.store.listByUserEmail(userEmail, { limit });

    return { sessions: rows.map(toListItem) };
  }

  async getProgress(
    userEmail: string,
  ): Promise<{ progress: InterviewProgressSummary }> {
    // Over-fetch a little: unfinished sessions are dropped below, and the
    // window keeps the most recent scored ones.
    const rows = await this.store.listByUserEmail(userEmail, {
      limit: PROGRESS_WINDOW * 2,
    });
    const scored = rows
      .map(toScored)
      .filter((session): session is ScoredSession => session !== null);

    return { progress: aggregateInterviewProgress(scored) };
  }
}

import type { StoredJob } from "./jobs.types";
import type { ScoreBreakdown } from "./matching/job-matching";

export const jobMatchStatuses = [
  "new",
  "seen",
  "saved",
  "dismissed",
  "applied",
] as const;
export type JobMatchStatus = (typeof jobMatchStatuses)[number];

export interface StoredJobMatch {
  id: string;
  userEmail: string;
  profileId: string;
  jobId: string;
  digestDate: string;
  score: number;
  scoreBreakdown: ScoreBreakdown | null;
  matchedSkills: string[];
  aiRank: number | null;
  aiReason: string | null;
  status: JobMatchStatus;
  applicationId: string | null;
  createdAt: string;
}

/** A proposal with the offer it points at, which is what a card shows. */
export interface JobMatchWithJob extends StoredJobMatch {
  job: StoredJob;
}

export interface NewJobMatch {
  userEmail: string;
  profileId: string;
  jobId: string;
  digestDate: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  matchedSkills: string[];
  aiRank?: number | null;
  aiReason?: string | null;
  jobSnapshot: StoredJob;
}

export const JOB_MATCHES_STORE = Symbol("JOB_MATCHES_STORE");

export type JobMatchesStore = {
  /** Every job already proposed to this user, so none is proposed twice. */
  listProposedJobIds(userEmail: string): Promise<string[]>;
  createMany(matches: readonly NewJobMatch[]): Promise<number>;
  /** The proposal for this offer, whether it came from a digest or a search. */
  findByJobId(userEmail: string, jobId: string): Promise<StoredJobMatch | null>;
  /** Statuses of several offers at once, to mark a page of search results. */
  listStatusesByJobIds(
    userEmail: string,
    jobIds: readonly string[],
  ): Promise<Map<string, StoredJobMatch>>;
  listByDigestDate(
    userEmail: string,
    digestDate: string,
  ): Promise<JobMatchWithJob[]>;
  listRecent(userEmail: string, limit: number): Promise<JobMatchWithJob[]>;
  findById(userEmail: string, matchId: string): Promise<JobMatchWithJob | null>;
  setStatus(
    userEmail: string,
    matchId: string,
    status: JobMatchStatus,
    applicationId?: string,
  ): Promise<StoredJobMatch | null>;
  deleteByUserEmail(userEmail: string): Promise<number>;
};

export interface DigestRun {
  runDate: string;
  status: "running" | "done" | "failed";
  stats: Record<string, unknown> | null;
  startedAt: string;
  finishedAt: string | null;
}

export const JOB_DIGEST_RUNS_STORE = Symbol("JOB_DIGEST_RUNS_STORE");

export type JobDigestRunsStore = {
  /**
   * Claims the day, or returns null because somebody else already has it.
   * This is the lock: the unique primary key decides, not a timer.
   */
  claim(runDate: string): Promise<DigestRun | null>;
  finish(
    runDate: string,
    outcome: { status: "done" | "failed"; stats: Record<string, unknown> },
  ): Promise<void>;
  find(runDate: string): Promise<DigestRun | null>;
};

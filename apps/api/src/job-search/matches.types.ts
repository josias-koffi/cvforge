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

/** What a run did: `digest` selects and notifies afterwards, `collect` stops. */
export type DigestRunKind = "digest" | "collect";

export interface DigestRun {
  id: string;
  runDate: string;
  kind: DigestRunKind;
  status: "running" | "done" | "failed";
  stats: Record<string, unknown> | null;
  startedAt: string;
  finishedAt: string | null;
}

export const JOB_DIGEST_RUNS_STORE = Symbol("JOB_DIGEST_RUNS_STORE");

export type JobDigestRunsStore = {
  /**
   * Starts a run, or returns null because the database refused it: the day's
   * selection was already made, or a collection is already running. Two
   * partial unique indexes decide, not a timer and not a flag in memory.
   */
  claim(runDate: string, kind: DigestRunKind): Promise<DigestRun | null>;
  finish(
    runId: string,
    outcome: { status: "done" | "failed"; stats: Record<string, unknown> },
  ): Promise<void>;
  /**
   * Fails the runs left `running` by a process that is gone, so a restart
   * mid-collection does not block every later one. Returns how many.
   */
  recoverStale(olderThanMs: number): Promise<number>;
  /** The history the admin screen reads, newest first. */
  list(limit: number): Promise<DigestRun[]>;
  /** The day's morning selection, whatever else ran that day. */
  find(runDate: string): Promise<DigestRun | null>;
  /**
   * Gives the day back, so a run can be asked for again. Only the `--force`
   * flag of the manual script uses it: a search configured after the morning
   * run would otherwise wait until tomorrow to be collected for.
   */
  release(runDate: string): Promise<boolean>;
};

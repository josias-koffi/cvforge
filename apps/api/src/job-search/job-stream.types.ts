
/** DI tokens for the continuous collection (US-163). */
export const JOB_STREAM_CURSORS_STORE = Symbol("JOB_STREAM_CURSORS_STORE");
export const JOB_SOURCE_CALLS_STORE = Symbol("JOB_SOURCE_CALLS_STORE");

/** A lease taken on a source's stream, with where the last read ended. */
export interface StreamLease {
  /** End of the last slice read in full; `null` before the first one. */
  cursorAt: Date | null;
}

/**
 * A stream's name: a source for the France Travail flow, or a pass of our
 * own (`boards_frequent`) that reads many sources.
 */
export type StreamKey = string;

export type JobStreamCursorsStore = {
  /**
   * Takes the source's lease for `leaseMs`, or returns null because another
   * instance holds it. The database decides, like `job_digest_runs`: a lease
   * left by a dead process expires by itself.
   */
  claim(source: StreamKey, owner: string, leaseMs: number): Promise<StreamLease | null>;
  /**
   * Moves the cursor, and extends the lease, only while `owner` holds it:
   * an instance whose lease was taken over must not move the cursor back.
   * Returns false when the lease was lost.
   */
  advance(source: StreamKey, owner: string, cursorAt: Date, leaseMs: number): Promise<boolean>;
  /** Frees the lease, keeping what the pass did for the admin screen. */
  release(
    source: StreamKey,
    owner: string,
    report?: Record<string, unknown>,
  ): Promise<void>;
  /** The last report of every stream. */
  lastReports(): Promise<Map<StreamKey, Record<string, unknown>>>;
};

import type { JobSource } from "./job-search.types";

export type JobSourceCallsStore = {
  add(source: JobSource, day: string, calls: number): Promise<void>;
  /** Calls per source on `day`, and since `monthStart` (both `YYYY-MM-DD`). */
  totals(day: string, monthStart: string): Promise<
    Map<JobSource, { today: number; month: number }>
  >;
};

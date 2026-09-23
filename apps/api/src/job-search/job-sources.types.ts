import type { JobSource } from "./job-search.types";

/** A source as the admin sees it: what it is, and what it last did. */
export interface JobSourceState {
  source: JobSource;
  enabled: boolean;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastListingCount: number;
  consecutiveFailures: number;
}

/** DI token for the sources registry. */
export const JOB_SOURCES_STORE = Symbol("JOB_SOURCES_STORE");

export type JobSourcesStore = {
  list(): Promise<JobSourceState[]>;
  /**
   * The sources that must **not** be called.
   *
   * Deliberately the negative: a source missing from the table has to count as
   * enabled, so that one added later is collected the day its adapter lands
   * rather than silently skipped because nobody inserted its row. A set of
   * allowed sources could not say that.
   */
  listDisabled(): Promise<Set<JobSource>>;
  setEnabled(source: JobSource, enabled: boolean): Promise<JobSourceState | null>;
  /** What the last run of that source gave, for the admin screen. */
  recordRun(
    source: JobSource,
    outcome: { listingCount: number; status: string; failed: boolean },
  ): Promise<void>;
};

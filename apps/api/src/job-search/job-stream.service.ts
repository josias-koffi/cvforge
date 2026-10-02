import { randomUUID } from "node:crypto";
import { Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import type { NormalizedJobListing } from "./job-search.types";
import type { JobSourcesStore } from "./job-sources.types";
import type { JobStreamCursorsStore } from "./job-stream.types";
import type { StreamSliceResult } from "./sources/france-travail.stream";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const DEFAULT_INTERVAL_MINUTES = 5;
/**
 * Offers created while the previous slice was being read can surface a moment
 * later: each slice starts two minutes before the last one ended, and the
 * deduplicator (US-111) absorbs what is read twice.
 */
export const STREAM_OVERLAP_MS = 2 * MINUTE_MS;
/** After a long outage, nothing older is read: past 30 days nothing is proposed. */
export const STREAM_MAX_CATCH_UP_MS = 31 * DAY_MS;
/**
 * A catch-up is read an hour at a time, the cursor saved after each: a crash
 * three days into a month of backlog resumes there, not at the start.
 */
export const STREAM_CHUNK_MS = 60 * MINUTE_MS;
/** Renewed after every chunk; a process that dies frees the stream this late. */
const LEASE_MS = 10 * MINUTE_MS;

export interface JobStreamConfig {
  enabled: boolean;
  intervalMs: number;
}

/**
 * `JOB_STREAM_ENABLED=true` turns the loop on. Off by default: production
 * waits for the purge (sprint 035) and for the France Travail application to
 * leave its trial status (ADR-027). `JOB_STREAM_INTERVAL_MINUTES` sets the
 * pace (5 by default).
 */
export function resolveJobStreamConfig(
  env: NodeJS.ProcessEnv = process.env,
): JobStreamConfig {
  const minutes = Number(env.JOB_STREAM_INTERVAL_MINUTES);

  return {
    enabled: env.JOB_STREAM_ENABLED?.trim().toLowerCase() === "true",
    intervalMs:
      (Number.isFinite(minutes) && minutes >= 1
        ? minutes
        : DEFAULT_INTERVAL_MINUTES) * MINUTE_MS,
  };
}

/** What reads a slice: the France Travail reader, or a fake in tests. */
export interface StreamReader {
  isEnabled(): boolean;
  read(from: Date, to: Date): Promise<StreamSliceResult>;
}

/** Where the offers read go: the live matcher (US-165), which keeps only what a search wants. */
export type StreamSink = (listings: NormalizedJobListing[]) => Promise<void>;

export type StreamTickResult =
  | { status: "skipped"; reason: string }
  | { status: "paused"; until: string }
  | { status: "locked" }
  | {
      status: "done" | "failed" | "lost";
      slices: number;
      listings: number;
      calls: number;
      cursorAt: string | null;
      error?: string;
    };

/**
 * The continuous collection of France Travail (ADR-027, US-163).
 *
 * Every few minutes, reads what was created since the end of the last slice
 * read in full. The cursor lives in the database and only moves once a slice
 * has been read and handed over: a restart, a crash or a 429 resumes exactly
 * there, without a hole and without a duplicate the deduplicator would not
 * absorb.
 */
export class JobStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobStreamService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  /** Set by a 429: no tick reads before it. */
  private pausedUntil = 0;

  constructor(
    private readonly reader: StreamReader,
    private readonly cursors: JobStreamCursorsStore,
    private readonly sourceStates: Pick<JobSourcesStore, "listDisabled">,
    private readonly sink: StreamSink,
    private readonly config: JobStreamConfig,
    private readonly now: () => number = Date.now,
    private readonly owner: string = randomUUID(),
  ) {}

  onModuleInit() {
    if (!this.config.enabled) return;

    this.timer = setInterval(() => {
      void this.tick().catch((error: unknown) => {
        this.logger.error(`Stream tick failed: ${String(error)}`);
      });
    }, this.config.intervalMs);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<StreamTickResult> {
    if (!this.reader.isEnabled()) {
      return { reason: "France Travail inactive", status: "skipped" };
    }
    // A slow catch-up must not be joined by the next tick of the same process.
    if (this.running) return { reason: "already running", status: "skipped" };
    if (this.now() < this.pausedUntil) {
      return {
        status: "paused",
        until: new Date(this.pausedUntil).toISOString(),
      };
    }
    if ((await this.sourceStates.listDisabled()).has("france_travail")) {
      return { reason: "source coupée", status: "skipped" };
    }

    const lease = await this.cursors.claim(
      "france_travail",
      this.owner,
      LEASE_MS,
    );
    if (!lease) return { status: "locked" };

    this.running = true;
    let result: StreamTickResult | undefined;

    try {
      result = await this.readUntilNow(lease.cursorAt);

      return result;
    } finally {
      this.running = false;
      await this.cursors.release(
        "france_travail",
        this.owner,
        result ? { ...result, at: new Date(this.now()).toISOString() } : undefined,
      );
    }
  }

  private async readUntilNow(
    cursorAt: Date | null,
  ): Promise<StreamTickResult> {
    const end = this.now();
    const tally = { calls: 0, listings: 0, slices: 0 };
    let start = this.startFrom(cursorAt, end);
    let cursor = cursorAt;
    const outcome = (
      status: "done" | "failed" | "lost",
      error?: string,
    ): StreamTickResult => ({
      ...tally,
      cursorAt: cursor?.toISOString() ?? null,
      error,
      status,
    });

    while (start < end) {
      const chunkEnd = Math.min(start + STREAM_CHUNK_MS, end);
      const result = await this.reader.read(new Date(start), new Date(chunkEnd));

      if (result.kind === "failed") {
        if (result.throttled) {
          this.pausedUntil =
            this.now() + (result.retryAfterMs ?? this.config.intervalMs);
        }
        this.logger.warn(`Stream slice failed, cursor kept: ${result.reason}`);

        return outcome("failed", result.reason);
      }

      tally.calls += result.calls;

      try {
        await this.sink(result.listings);
      } catch (error) {
        this.logger.warn(`Stream sink failed, cursor kept: ${String(error)}`);

        return outcome("failed", String(error));
      }

      const next = new Date(chunkEnd);
      if (
        !(await this.cursors.advance("france_travail", this.owner, next, LEASE_MS))
      ) {
        // Another instance took the stream over: it reads from its own cursor.
        return outcome("lost", "lease lost");
      }

      cursor = next;
      tally.slices += 1;
      tally.listings += result.listings.length;
      start = chunkEnd;
    }

    return outcome("done");
  }

  /**
   * Two minutes before the cursor, never more than 31 days back. Without a
   * cursor, the first slice is the last interval: the daily pass and the
   * `--since=31` backfill already hold what came before.
   */
  private startFrom(cursorAt: Date | null, end: number): number {
    const floor = end - STREAM_MAX_CATCH_UP_MS;

    if (!cursorAt) return end - this.config.intervalMs - STREAM_OVERLAP_MS;

    return Math.max(cursorAt.getTime() - STREAM_OVERLAP_MS, floor);
  }
}

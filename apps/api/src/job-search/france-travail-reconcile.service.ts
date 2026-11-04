import { randomUUID } from "node:crypto";
import { Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import type { NormalizedJobListing } from "./job-search.types";
import type { JobsStore } from "./jobs.types";
import type { JobSourcesStore } from "./job-sources.types";
import type { StreamReader, StreamSink } from "./job-stream.service";
import type { JobStreamCursorsStore } from "./job-stream.types";
import { DEFAULT_MAX_AGE_DAYS } from "./matching/job-matching";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** The stream name under which the lease and the last walk are kept. */
export const RECONCILE_KEY = "france_travail_reconcile";
/** Checked every hour: a walk stopped by a 429 or a restart starts again soon. */
const CHECK_INTERVAL_MS = HOUR_MS;
/** First check after boot. */
const FIRST_CHECK_MS = 3 * MINUTE_MS;
/** A walk older than this is due; the licence asks for 24 h at most (ADR-027). */
const MIN_INTERVAL_MS = 23 * HOUR_MS;
/** Three hours at a time: a few thousand offers in memory, a cut only at the peak. */
const CHUNK_MS = 3 * HOUR_MS;
/** A walk takes minutes; a process that dies mid-walk frees it this late. */
const LEASE_MS = 6 * HOUR_MS;
/** Ids sent to the database at once. */
const TOUCH_BATCH = 1_000;
/**
 * Below this many offers France Travail "listing" nothing credible: an outage
 * answering 204 everywhere must not close the whole market.
 */
const MIN_CREDIBLE_WALK = 1_000;

export interface ReconcileResult {
  status: "skipped" | "locked" | "done" | "failed";
  reason?: string;
  seen?: number;
  stored?: number;
  closed?: number;
  calls?: number;
}

/**
 * Walks every open France Travail offer of the retention window once a day.
 *
 * The stream reads creations only, so on its own it never learns that an offer
 * was filled — and the licence forbids showing an offer as it no longer is.
 * One walk of the last 90 days (≈ 455 000 offers, ≈ 3 000 calls) does three
 * things at once:
 *   - an offer we hold is marked seen, without being rewritten;
 *   - an offer we do not hold — the whole market on the first walk, a missed
 *     slice afterwards — is stored through the same sink as the stream;
 *   - once the walk is complete, an offer it did not find is closed.
 * A walk that fails halfway closes nothing and does not count as done.
 */
export class FranceTravailReconciler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FranceTravailReconciler.name);
  private timer: NodeJS.Timeout | null = null;
  private first: NodeJS.Timeout | null = null;
  private running = false;
  private pausedUntil = 0;

  constructor(
    private readonly reader: StreamReader,
    private readonly cursors: JobStreamCursorsStore,
    private readonly sourceStates: Pick<JobSourcesStore, "listDisabled">,
    private readonly jobs: Pick<
      JobsStore,
      "touchListings" | "closeListingsNotSeenSince"
    >,
    private readonly sink: StreamSink,
    private readonly now: () => number = Date.now,
    private readonly owner: string = randomUUID(),
  ) {}

  onModuleInit() {
    const check = () =>
      void this.run().catch((error: unknown) => {
        this.logger.error(`Reconciliation failed: ${String(error)}`);
      });

    // A first check shortly after boot: a fresh deployment must not wait an hour.
    this.first = setTimeout(check, FIRST_CHECK_MS);
    this.timer = setInterval(check, CHECK_INTERVAL_MS);
    this.first.unref?.();
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.first) clearTimeout(this.first);
    if (this.timer) clearInterval(this.timer);
  }

  async run(): Promise<ReconcileResult> {
    if (!this.reader.isEnabled()) {
      return { reason: "France Travail inactive", status: "skipped" };
    }
    if (this.running) return { reason: "already running", status: "skipped" };
    if (this.now() < this.pausedUntil) {
      return { reason: "paused after a 429", status: "skipped" };
    }
    if ((await this.sourceStates.listDisabled()).has("france_travail")) {
      return { reason: "source coupée", status: "skipped" };
    }

    const lease = await this.cursors.claim(RECONCILE_KEY, this.owner, LEASE_MS);
    if (!lease) return { status: "locked" };

    this.running = true;
    let result: ReconcileResult = { reason: "not due", status: "skipped" };

    try {
      const due =
        !lease.cursorAt || this.now() - lease.cursorAt.getTime() >= MIN_INTERVAL_MS;
      if (due) result = await this.walk();

      return result;
    } finally {
      this.running = false;
      await this.cursors.release(
        RECONCILE_KEY,
        this.owner,
        result.status === "skipped"
          ? undefined
          : { ...result, at: new Date(this.now()).toISOString() },
      );
    }
  }

  private async walk(): Promise<ReconcileResult> {
    const startedAt = this.now();
    const from = startedAt - DEFAULT_MAX_AGE_DAYS * DAY_MS;
    const tally = { calls: 0, seen: 0, stored: 0 };

    for (let start = from; start < startedAt; start += CHUNK_MS) {
      const end = Math.min(start + CHUNK_MS, startedAt);
      const slice = await this.reader.read(new Date(start), new Date(end));

      if (slice.kind === "failed") {
        if (slice.throttled) {
          this.pausedUntil =
            this.now() + (slice.retryAfterMs ?? CHECK_INTERVAL_MS);
        }
        this.logger.warn(`Reconciliation stopped, nothing closed: ${slice.reason}`);

        return { ...tally, reason: slice.reason, status: "failed" };
      }

      tally.calls += slice.calls;
      tally.seen += slice.listings.length;

      try {
        tally.stored += await this.confirm(slice.listings, startedAt);
      } catch (error) {
        this.logger.warn(`Reconciliation stopped, nothing closed: ${String(error)}`);

        return { ...tally, reason: String(error), status: "failed" };
      }
    }

    if (tally.seen < MIN_CREDIBLE_WALK) {
      return {
        ...tally,
        reason: `walk found only ${tally.seen} offers, nothing closed`,
        status: "failed",
      };
    }

    const closed = await this.jobs.closeListingsNotSeenSince({
      at: new Date(this.now()).toISOString(),
      createdSince: new Date(from).toISOString(),
      seenBefore: new Date(startedAt).toISOString(),
      source: "france_travail",
    });
    await this.cursors.advance(
      RECONCILE_KEY,
      this.owner,
      new Date(startedAt),
      LEASE_MS,
    );
    this.logger.log(
      `Reconciliation: ${tally.seen} offers seen, ${tally.stored} stored, ${closed} closed, ${tally.calls} calls.`,
    );

    return { ...tally, closed, status: "done" };
  }

  /** Marks what we hold as seen, hands the rest to the sink; returns how many it stored. */
  private async confirm(
    listings: NormalizedJobListing[],
    startedAt: number,
  ): Promise<number> {
    const at = new Date(startedAt).toISOString();
    const missing = new Set<string>();

    for (let index = 0; index < listings.length; index += TOUCH_BATCH) {
      const batch = listings.slice(index, index + TOUCH_BATCH);
      const unknown = await this.jobs.touchListings({
        at,
        externalIds: batch.map((listing) => listing.externalId),
        source: "france_travail",
      });
      for (const id of unknown) missing.add(id);
    }

    const toStore = listings.filter((listing) => missing.has(listing.externalId));
    if (toStore.length > 0) await this.sink(toStore);

    return toStore.length;
  }
}

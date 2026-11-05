import { randomUUID } from "node:crypto";
import { Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import type { JobStreamCursorsStore } from "./job-stream.types";
import type { CrawlRunner, DiscoveryReport } from "./sources/boards/crawl-runner";

const HOUR_MS = 3_600_000;
/** The stream name under which the lease and the last run are kept. */
export const DISCOVERY_KEY = "boards_discovery";
/** Checked every hour; a run is due once a day. */
const CHECK_INTERVAL_MS = HOUR_MS;
const MIN_INTERVAL_MS = 23 * HOUR_MS;
/** First check shortly after boot, so a fresh deployment does not wait an hour. */
const FIRST_CHECK_MS = 3 * 60_000;
/** A run is bounded by its verification budget; a dead process frees this late. */
const LEASE_MS = 90 * 60_000;

export type DiscoveryRunResult =
  | { status: "skipped"; reason: string }
  | { status: "locked" }
  | ({ status: "done" } & DiscoveryReport)
  | { status: "failed"; reason: string };

/**
 * Finds new companies on the recruiting software's public boards, once a day.
 *
 * The registry used to grow only from France Travail's partner links and from
 * candidates' imports: after five weeks in production it still held the 31
 * companies of the shipped list. The Common Crawl discovery existed, but only
 * as a script nobody ran (ADR-023). Each run verifies a bounded number of new
 * companies, so a registry of tens of thousands fills in over days without
 * ever bursting the providers' limits.
 */
export class BoardDiscoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BoardDiscoveryService.name);
  private timer: NodeJS.Timeout | null = null;
  private first: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly runner: Pick<CrawlRunner, "run">,
    private readonly cursors: JobStreamCursorsStore,
    /**
     * Registers the shipped list first. Replaying it is harmless (it never
     * re-enables a board an admin switched off), and without it a new batch
     * of companies would wait for somebody to run `boards:seed` by hand.
     */
    private readonly seed: () => Promise<unknown> = async () => {},
    private readonly now: () => number = Date.now,
    private readonly owner: string = randomUUID(),
  ) {}

  onModuleInit() {
    const check = () =>
      void this.run().catch((error: unknown) => {
        this.logger.error(`Board discovery failed: ${String(error)}`);
      });

    this.first = setTimeout(check, FIRST_CHECK_MS);
    this.timer = setInterval(check, CHECK_INTERVAL_MS);
    this.first.unref?.();
    this.timer.unref?.();
  }

  /** Frees a lease this process holds: a deployment must not lock the run. */
  async onModuleDestroy() {
    if (this.first) clearTimeout(this.first);
    if (this.timer) clearInterval(this.timer);
    if (this.running) await this.cursors.release(DISCOVERY_KEY, this.owner);
  }

  async run(): Promise<DiscoveryRunResult> {
    if (this.running) return { reason: "already running", status: "skipped" };

    const lease = await this.cursors.claim(DISCOVERY_KEY, this.owner, LEASE_MS);
    if (!lease) return { status: "locked" };

    this.running = true;
    let result: DiscoveryRunResult = { reason: "not due", status: "skipped" };

    try {
      const due =
        !lease.cursorAt || this.now() - lease.cursorAt.getTime() >= MIN_INTERVAL_MS;
      if (!due) return result;

      const startedAt = this.now();
      try {
        await this.seed();
        const report = await this.runner.run();
        result = { ...report, status: "done" };

        // A run in which no index request got an answer is not a day done:
        // the next check tries again instead of waiting for tomorrow.
        if (report.patterns.some((pattern) => pattern.collection !== null)) {
          await this.cursors.advance(DISCOVERY_KEY, this.owner, new Date(startedAt), LEASE_MS);
        } else {
          result = { reason: "no crawl answered", status: "failed" };
        }
        this.logger.log(`Board discovery: ${JSON.stringify(report)}`);
      } catch (error) {
        result = { reason: String(error), status: "failed" };
        this.logger.error(`Board discovery failed: ${String(error)}`);
      }

      return result;
    } finally {
      this.running = false;
      await this.cursors.release(
        DISCOVERY_KEY,
        this.owner,
        result.status === "skipped"
          ? undefined
          : { ...result, at: new Date(this.now()).toISOString() },
      );
    }
  }
}

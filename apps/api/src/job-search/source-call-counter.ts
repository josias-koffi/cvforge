import { Logger } from "@nestjs/common";
import type { JobSource } from "./job-search.types";
import type { JobSourceCallsStore } from "./job-stream.types";
import { dateInParis } from "./paris-time";

const FLUSH_INTERVAL_MS = 60_000;

/**
 * Counts the calls made to each source, per day (US-163).
 *
 * Counted in memory and written once a minute: a database write per call
 * would double the work of a collection that makes hundreds of them. A crash
 * loses at most a minute of counting, which a quota view can live with.
 */
export class SourceCallCounter {
  private readonly logger = new Logger(SourceCallCounter.name);
  private pending = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly store: JobSourceCallsStore,
    private readonly now: () => number = Date.now,
  ) {}

  add(source: JobSource): void {
    const key = `${source}|${dateInParis(this.now())}`;
    this.pending.set(key, (this.pending.get(key) ?? 0) + 1);
  }

  start(): void {
    this.timer = setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
    this.timer.unref?.();
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.flush();
  }

  async flush(): Promise<void> {
    const batch = this.pending;
    this.pending = new Map();

    for (const [key, calls] of batch) {
      const [source, day] = key.split("|") as [JobSource, string];

      try {
        await this.store.add(source, day, calls);
      } catch (error) {
        // Put back: counted on the next flush rather than lost.
        this.pending.set(key, (this.pending.get(key) ?? 0) + calls);
        this.logger.warn(`Could not record ${source} calls: ${String(error)}`);
      }
    }
  }
}

import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ATS_SCAN_STORE, type AtsScanStore } from "./ats.types";

const MS_PER_DAY = 86_400_000;

/**
 * Drops scans past their retention deadline.
 *
 * A row holds no CV text — only scores and finding codes — but it does hold the
 * lead's email once unlocked, and an `ip_hash`. Thirty days is what the privacy
 * policy promises, so something has to enforce it.
 *
 * Modelled on `InterviewPurgeService`: an interval on the module lifecycle
 * rather than a cron library, which is the convention here.
 */
@Injectable()
export class AtsPurgeService implements OnModuleInit, OnModuleDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  /** The run started at boot, so shutdown can wait for it. */
  private pending: Promise<unknown> = Promise.resolve();

  constructor(@Inject(ATS_SCAN_STORE) private readonly store: AtsScanStore) {}

  onModuleInit() {
    this.schedulePurge();
    this.intervalId = setInterval(() => this.schedulePurge(), MS_PER_DAY);
  }

  /**
   * Awaiting the run started at boot matters for the one-shot scripts: they
   * close the database as soon as their own work is done, and a check still
   * in flight would then fail on a dead pool and print a stack trace that
   * looks like the script itself failed.
   */
  async onModuleDestroy() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await this.pending;
  }

  /**
   * Nothing awaits the purge, so a database error would surface as an unhandled
   * rejection and take the API down. It is logged and the next run tries again.
   */
  private schedulePurge() {
    this.pending = this.purge().catch((error: unknown) => {
      console.error("[ats] retention purge failed", error);
    });
  }

  purge(): Promise<number> {
    return this.store.deleteExpired(new Date().toISOString());
  }
}

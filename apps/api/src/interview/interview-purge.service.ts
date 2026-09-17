import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { AUDIO_RETENTION_DAYS } from "../privacy/privacy-retention-policy";
import type { InterviewStore } from "./interview.types";

const MS_PER_DAY = 86_400_000;

@Injectable()
export class InterviewPurgeService implements OnModuleInit, OnModuleDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly store: InterviewStore) {}

  onModuleInit() {
    this.schedulePurge();
    this.intervalId = setInterval(() => this.schedulePurge(), MS_PER_DAY);
  }

  /**
   * Nothing awaits the retention purge, so a database error would surface as
   * an unhandled rejection and take the API down. It is logged and the next
   * run tries again.
   */
  private schedulePurge() {
    this.purge().catch((error: unknown) => {
      console.error("[interview] retention purge failed", error);
    });
  }

  onModuleDestroy() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  purge(): Promise<number> {
    const cutoff = new Date(
      Date.now() - AUDIO_RETENTION_DAYS * MS_PER_DAY,
    ).toISOString();

    return this.store.purgeCompletedBefore(cutoff);
  }
}

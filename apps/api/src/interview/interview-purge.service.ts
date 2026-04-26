import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { AUDIO_RETENTION_DAYS } from "../privacy/privacy-retention-policy";
import type { InterviewStore } from "./interview.types";

const MS_PER_DAY = 86_400_000;

@Injectable()
export class InterviewPurgeService implements OnModuleInit, OnModuleDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly store: InterviewStore) {}

  onModuleInit() {
    this.purge();
    this.intervalId = setInterval(() => this.purge(), MS_PER_DAY);
  }

  onModuleDestroy() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  purge(): number {
    const cutoff = new Date(
      Date.now() - AUDIO_RETENTION_DAYS * MS_PER_DAY,
    ).toISOString();

    return this.store.purgeCompletedBefore(cutoff);
  }
}

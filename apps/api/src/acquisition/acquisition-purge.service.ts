import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { toIsoDay } from "./acquisition-events.service";
import {
  ACQUISITION_EVENT_STORE,
  type AcquisitionEventStore,
} from "./acquisition.types";

const MS_PER_DAY = 86_400_000;
/** Three times the dashboard window: enough to compare, no reason to keep more. */
export const EVENT_RETENTION_DAYS = 90;

/**
 * Drops funnel events past their retention. Same lifecycle as
 * `AtsPurgeService`: a daily interval on the module, logged rather than thrown.
 */
@Injectable()
export class AcquisitionPurgeService implements OnModuleInit, OnModuleDestroy {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private pending: Promise<unknown> = Promise.resolve();

  constructor(
    @Inject(ACQUISITION_EVENT_STORE)
    private readonly store: AcquisitionEventStore,
    private readonly now: () => number = Date.now,
  ) {}

  onModuleInit() {
    this.schedulePurge();
    this.intervalId = setInterval(() => this.schedulePurge(), MS_PER_DAY);
  }

  async onModuleDestroy() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await this.pending;
  }

  private schedulePurge() {
    this.pending = this.purge().catch((error: unknown) => {
      console.error("[acquisition] retention purge failed", error);
    });
  }

  purge(): Promise<number> {
    return this.store.deleteBefore(
      toIsoDay(this.now() - EVENT_RETENTION_DAYS * MS_PER_DAY),
    );
  }
}

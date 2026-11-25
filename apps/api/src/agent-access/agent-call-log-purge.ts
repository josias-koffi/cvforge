import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import type { AgentTokensStore } from "./agent-tokens.pg-store";

const DAY_MS = 24 * 60 * 60 * 1000;
export const AGENT_CALL_LOG_RETENTION_DAYS = 90;

/** Drops the agents' activity log past 90 days (ADR-032 §9), once a day. */
export class AgentCallLogPurge implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentCallLogPurge.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private pending: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly store: Pick<AgentTokensStore, "purgeCallsBefore">,
    private readonly now: () => number = Date.now,
  ) {}

  onModuleInit() {
    this.schedule();
    this.timer = setInterval(() => this.schedule(), DAY_MS);
    this.timer.unref?.();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.pending;
  }

  run() {
    return this.store.purgeCallsBefore(
      new Date(this.now() - AGENT_CALL_LOG_RETENTION_DAYS * DAY_MS),
    );
  }

  /** Nothing awaits the pass: an error is logged, tomorrow retries. */
  private schedule() {
    this.pending = this.run().catch((error: unknown) => {
      this.logger.error(`Agent call log purge failed: ${String(error)}`);
    });
  }
}

import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import type { AgentTokensStore } from "./agent-tokens.pg-store";
import type { OAuthStore } from "./oauth/oauth.pg-store";

const DAY_MS = 24 * 60 * 60 * 1000;
export const AGENT_CALL_LOG_RETENTION_DAYS = 90;
export const IDLE_OAUTH_CLIENT_DAYS = 30;

/**
 * Once a day: drops the agents' activity log past 90 days (ADR-032 §9), and
 * the self-registered OAuth clients nobody connected with in 30 days
 * (ADR-033: Claude registers a new one on each connection without CIMD).
 */
export class AgentCallLogPurge implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentCallLogPurge.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private pending: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly store: Pick<AgentTokensStore, "purgeCallsBefore">,
    private readonly oauth: Pick<OAuthStore, "purgeIdleClients">,
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

  async run() {
    const now = this.now();

    await this.store.purgeCallsBefore(
      new Date(now - AGENT_CALL_LOG_RETENTION_DAYS * DAY_MS),
    );
    await this.oauth.purgeIdleClients(
      new Date(now - IDLE_OAUTH_CLIENT_DAYS * DAY_MS),
    );
  }

  /** Nothing awaits the pass: an error is logged, tomorrow retries. */
  private schedule() {
    this.pending = this.run().catch((error: unknown) => {
      this.logger.error(`Agent call log purge failed: ${String(error)}`);
    });
  }
}

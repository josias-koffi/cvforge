import type { OpenRouterBalanceConfig } from './openrouter-balance.config';

export interface OpenRouterBalance {
  totalCredits: number;
  totalUsage: number;
  /** `totalCredits - totalUsage`, the account balance OpenRouter bills against. */
  remaining: number;
  /** True when the read failed and this is the last known value. */
  stale: boolean;
  fetchedAt: string;
}

/** Long enough to keep the admin dashboard cheap, short enough to catch a drain. */
export const BALANCE_CACHE_TTL_MS = 5 * 60 * 1000;

const CREDITS_PATH = '/credits';

type CreditsResponse = {
  data?: { total_credits?: number; total_usage?: number };
};

/**
 * Reads the OpenRouter account balance, memoised for `BALANCE_CACHE_TTL_MS`.
 *
 * Deliberately dependency-free: no cron, no Redis, no queue. The cache is a
 * process field, so each API instance holds its own — acceptable for a read
 * that only feeds an admin screen and a purchase guard.
 */
export class OpenRouterBalanceService {
  private cached: OpenRouterBalance | null = null;

  constructor(
    private readonly config: OpenRouterBalanceConfig,
    private readonly now: () => number = Date.now,
  ) {}

  /** False when no management key is configured; callers degrade gracefully. */
  get isEnabled() {
    return this.config.managementApiKey !== '';
  }

  get alertThreshold() {
    return this.config.alertThreshold;
  }

  get criticalThreshold() {
    return this.config.criticalThreshold;
  }

  /**
   * True when we must stop selling credits we could not honour.
   *
   * Fails **open**: supervision disabled, or a balance we cannot read at all,
   * answers `false`. Refusing every purchase because monitoring is down would
   * cost more than the rare sale made just before a top-up — and the admin
   * alert (US-084) already covers the balance actually running low. A *stale*
   * reading still counts, since a known-empty account does not refill itself.
   */
  async isUnderCriticalThreshold(): Promise<boolean> {
    const balance = await this.getBalance();

    return balance ? balance.remaining <= this.config.criticalThreshold : false;
  }

  /**
   * Returns the balance, or `null` when supervision is disabled or the very
   * first read fails. A later failure yields the cached value with
   * `stale: true` rather than nothing.
   */
  async getBalance(): Promise<OpenRouterBalance | null> {
    if (!this.isEnabled) {
      return null;
    }

    const fresh = this.cached && !this.isExpired(this.cached);

    if (fresh) {
      return this.cached;
    }

    try {
      this.cached = await this.readBalance();

      return this.cached;
    } catch (error) {
      console.error('[openrouter] balance read failed', error);

      if (!this.cached) {
        return null;
      }

      this.cached = { ...this.cached, stale: true };

      return this.cached;
    }
  }

  private isExpired(balance: OpenRouterBalance) {
    return (
      this.now() - new Date(balance.fetchedAt).getTime() >= BALANCE_CACHE_TTL_MS
    );
  }

  private async readBalance(): Promise<OpenRouterBalance> {
    const response = await fetch(`${this.config.baseUrl}${CREDITS_PATH}`, {
      headers: {
        Authorization: `Bearer ${this.config.managementApiKey}`,
        'HTTP-Referer': 'https://cvforge.app',
        'X-Title': 'CVforge',
      },
      method: 'GET',
    });

    if (response.status === 403) {
      throw new Error(
        'OpenRouter refused the balance read: OPENROUTER_MANAGEMENT_API_KEY must be a management key, not an inference key.',
      );
    }

    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        // ignore
      }
      throw new Error(
        `OpenRouter balance request failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
      );
    }

    const { data } = (await response.json()) as CreditsResponse;
    const totalCredits = data?.total_credits;
    const totalUsage = data?.total_usage;

    if (typeof totalCredits !== 'number' || typeof totalUsage !== 'number') {
      throw new Error('OpenRouter balance response is missing credit totals.');
    }

    return {
      fetchedAt: new Date(this.now()).toISOString(),
      remaining: totalCredits - totalUsage,
      stale: false,
      totalCredits,
      totalUsage,
    };
  }
}

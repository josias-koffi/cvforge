import { Injectable } from "@nestjs/common";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import type { MetricsConfig } from "./metrics.config";
import type { AdminMetrics, MetricsStore } from "./metrics.types";

type BalanceReader = Pick<OpenRouterBalanceService, "getBalance" | "isEnabled">;

@Injectable()
export class MetricsService {
  constructor(
    private readonly store: MetricsStore,
    private readonly balanceService: BalanceReader,
    private readonly config: MetricsConfig,
  ) {}

  async readAdminMetrics(): Promise<AdminMetrics> {
    const [counters, ats, balance] = await Promise.all([
      this.store.readProductCounters(this.config.activeWindowDays),
      this.store.readAtsCounters(),
      this.balanceService.isEnabled
        ? this.balanceService.getBalance()
        : Promise.resolve(null),
    ]);

    const apiCost = balance
      ? {
          estimatedEurCents: Math.round(
            balance.totalUsage * this.config.usdToEurRate * 100,
          ),
          stale: balance.stale,
          usdToEurRate: this.config.usdToEurRate,
          usedUsd: balance.totalUsage,
        }
      : null;

    return {
      activeWindowDays: this.config.activeWindowDays,
      apiCost,
      applications: { totalCount: counters.applicationCount },
      ats: {
        ...ats,
        // Null rather than 0 on an empty funnel: "no scans yet" and "nobody
        // converted" are different facts, and a 0 % reads as a failure.
        conversionRate: ratio(ats.convertedLeadCount, ats.unlockedScanCount),
        unlockRate: ratio(ats.unlockedScanCount, ats.publicScanCount),
      },
      credits: {
        consumed: counters.creditsConsumed,
        granted: counters.creditsGranted,
        sold: counters.creditsSold,
      },
      documents: {
        cvImportCount: counters.cvImportCount,
        generatedCvCount: counters.generatedCvCount,
        generatedLetterCount: counters.generatedLetterCount,
        offerEnrichmentCount: counters.offerEnrichmentCount,
      },
      generatedAt: new Date().toISOString(),
      interviews: {
        completedCount: counters.interviewCompletedCount,
        totalCount: counters.interviewCount,
      },
      margin: apiCost
        ? buildMargin(counters.grossRevenueCents, apiCost.estimatedEurCents)
        : null,
      revenue: {
        currency: "eur",
        grossCents: counters.grossRevenueCents,
        paidOrderCount: counters.paidOrderCount,
      },
      users: {
        activeCount: counters.activeUserCount,
        adminCount: counters.totalAdminCount,
        totalCount: counters.totalUserCount,
      },
    };
  }
}

/** `ratio` stays null with no revenue: a margin rate over zero means nothing. */
function buildMargin(grossCents: number, costCents: number) {
  const netEurCents = grossCents - costCents;

  return {
    netEurCents,
    ratio: grossCents > 0 ? netEurCents / grossCents : null,
  };
}

/** A percentage, or null when there is nothing to divide by. */
function ratio(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

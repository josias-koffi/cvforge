import { acquisitionTools, type AcquisitionTool } from "@cvforge/types";
import { Injectable } from "@nestjs/common";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import {
  LEAD_INTERVIEW_SOURCE_LABEL,
  LEAD_OFFER_SOURCE_LABEL,
} from "../applications/applications.types";
import type { MetricsConfig } from "./metrics.config";
import type {
  AcquisitionFunnel,
  AcquisitionStepCount,
  AdminMetrics,
  MetricsStore,
} from "./metrics.types";

const MS_PER_DAY = 86_400_000;

type BalanceReader = Pick<OpenRouterBalanceService, "getBalance" | "isEnabled">;

@Injectable()
export class MetricsService {
  constructor(
    private readonly store: MetricsStore,
    private readonly balanceService: BalanceReader,
    private readonly config: MetricsConfig,
  ) {}

  async readAdminMetrics(): Promise<AdminMetrics> {
    // Both reads start at midnight UTC of the same day: the steps are counted
    // per day, and an activation counted from a later hour would not match.
    const sinceDay = new Date(
      Date.now() - this.config.activeWindowDays * MS_PER_DAY,
    )
      .toISOString()
      .slice(0, 10);
    const [
      counters,
      ats,
      acquisitionSteps,
      atsActivations,
      keywordMatchActivations,
      jobMarketActivations,
      companyCheckActivations,
      interviewQuestionsActivations,
      balance,
    ] = await Promise.all([
      this.store.readProductCounters(this.config.activeWindowDays),
      this.store.readAtsCounters(),
      this.store.readAcquisitionSteps(sinceDay),
      this.store.readAtsActivations(new Date(sinceDay)),
      this.store.readOfferLeadActivations(
        LEAD_OFFER_SOURCE_LABEL,
        new Date(sinceDay),
      ),
      this.store.readSearchLeadActivations("job_market", new Date(sinceDay)),
      this.store.readSearchLeadActivations("company_check", new Date(sinceDay)),
      this.store.readOfferLeadActivations(
        LEAD_INTERVIEW_SOURCE_LABEL,
        new Date(sinceDay),
      ),
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
      acquisition: buildFunnels(acquisitionSteps, {
        ats: atsActivations,
        company_check: companyCheckActivations,
        interview_questions: interviewQuestionsActivations,
        job_market: jobMarketActivations,
        keyword_match: keywordMatchActivations,
      }),
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

/**
 * One funnel per known tool, zeros included: a tool nobody opened yet still
 * belongs on the dashboard. Rows for a tool no longer in the list are dropped.
 */
function buildFunnels(
  steps: AcquisitionStepCount[],
  activations: Partial<Record<AcquisitionTool, number>>,
): AcquisitionFunnel[] {
  return acquisitionTools.map((tool) => {
    const visitorsAt = (step: string) =>
      steps.find((row) => row.tool === tool && row.step === step)?.visitors ??
      0;

    return {
      accountsActivated: activations[tool] ?? null,
      ctaClicks: visitorsAt("cta_click"),
      emailsSubmitted: visitorsAt("email_submitted"),
      results: visitorsAt("result"),
      tool,
      visitors: visitorsAt("view"),
    };
  });
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

import {
  acquisitionTools,
  type AcquisitionFunnel,
  type AcquisitionMetrics,
  type AcquisitionTool,
} from "@cvforge/types";
import {
  LEAD_INTERVIEW_SOURCE_LABEL,
  LEAD_OFFER_SOURCE_LABEL,
} from "../../applications/applications.types";
import {
  percent,
  toWindowDto,
  type Range,
  type ResolvedWindow,
} from "../shared/metrics-window";
import { bucketDates } from "../shared/time-series";
import type {
  AcquisitionStepCount,
  PgAcquisitionMetricsStore,
} from "./acquisition.pg-store";

/** The "Acquisition" tab: each free tool's funnel, and its audience over time. */
export class AcquisitionMetricsService {
  constructor(private readonly store: PgAcquisitionMetricsStore) {}

  async read(window: ResolvedWindow): Promise<AcquisitionMetrics> {
    // Funnel steps are counted per day: the range starts at midnight UTC so an
    // activation is counted over exactly the same days as the steps.
    const range = window.current;
    const [steps, activations, series, publicAts] = await Promise.all([
      this.store.readSteps(range),
      this.readActivations(range),
      this.store.readViewSeries(range, window.bucket),
      this.store.readPublicAts(range),
    ]);
    const dates = bucketDates(window, series.map((row) => row.date).sort()[0] ?? null);

    return {
      funnels: buildFunnels(steps, activations),
      publicAts: { ...publicAts, unlockRate: percent(publicAts.unlocked, publicAts.scans) },
      series: dates.map((date) => {
        const point: AcquisitionMetrics["series"][number] = { date };
        for (const tool of acquisitionTools) {
          point[tool] =
            series.find((row) => row.date === date && row.tool === tool)?.visitors ?? 0;
        }
        return point;
      }),
      window: toWindowDto(window),
    };
  }

  async readActivations(range: Range): Promise<Record<AcquisitionTool, number>> {
    const [ats, keywordMatch, jobMarket, companyCheck, interviewQuestions] =
      await Promise.all([
        this.store.readAtsActivations(range),
        this.store.readOfferLeadActivations(LEAD_OFFER_SOURCE_LABEL, range),
        this.store.readSearchLeadActivations("job_market", range),
        this.store.readSearchLeadActivations("company_check", range),
        this.store.readOfferLeadActivations(LEAD_INTERVIEW_SOURCE_LABEL, range),
      ]);

    return {
      ats,
      company_check: companyCheck,
      interview_questions: interviewQuestions,
      job_market: jobMarket,
      keyword_match: keywordMatch,
    };
  }
}

/**
 * One funnel per known tool, zeros included: a tool nobody opened yet still
 * belongs on the cockpit. Rows for a tool no longer in the list are dropped.
 */
export function buildFunnels(
  steps: AcquisitionStepCount[],
  activations: Partial<Record<AcquisitionTool, number>>,
): AcquisitionFunnel[] {
  return acquisitionTools.map((tool) => {
    const visitorsAt = (step: string) =>
      steps.find((row) => row.tool === tool && row.step === step)?.visitors ?? 0;

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

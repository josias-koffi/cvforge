import type { UsageMetrics } from "@cvforge/types";
import {
  percent,
  readKpi,
  toWindowDto,
  type ResolvedWindow,
} from "../shared/metrics-window";
import { bucketDates, fillSeries, oldestDate } from "../shared/time-series";
import type { PgUsageStore } from "./usage.pg-store";

/** The "Produit" tab: what candidates do once they are in. */
export class UsageMetricsService {
  constructor(private readonly store: PgUsageStore) {}

  async read(window: ResolvedWindow): Promise<UsageMetrics> {
    const [kpis, series, onboarding, interviews, cvTemplates, letterTemplates, ats, retention] =
      await Promise.all([
        this.readKpis(window),
        this.store.readSeries(window.current, window.bucket),
        this.store.readOnboarding(window.current),
        this.store.readInterviewOutcomes(window.current),
        this.store.readTemplateUsage("cv", window.current),
        this.store.readTemplateUsage("letter", window.current),
        this.store.readAtsScores(window.current),
        this.store.readRetention(window.now),
      ]);
    const dates = bucketDates(window, oldestDate(...Object.values(series)));

    return {
      atsScoresByEngine: ats,
      cvTemplates,
      interviews,
      kpis,
      letterTemplates,
      onboardingRate: percent(onboarding.done, onboarding.signups),
      retention: retention.map((row) => ({
        activeAfter30Days: percent(row.active30, row.eligible30),
        activeAfter7Days: percent(row.active7, row.eligible7),
        cohort: row.cohort,
        signups: row.signups,
      })),
      series: fillSeries(dates, series),
      window: toWindowDto(window),
    };
  }

  private async readKpis(window: ResolvedWindow): Promise<UsageMetrics["kpis"]> {
    const documents = await Promise.all([
      this.store.readDocuments(window.current),
      window.previous ? this.store.readDocuments(window.previous) : Promise.resolve(null),
    ]);
    const documentKpi = (action: keyof (typeof documents)[0]) => ({
      previous: documents[1]?.[action] ?? null,
      value: documents[0][action],
    });
    const [applications, interviews, atsScans] = await Promise.all([
      readKpi(window, (range) => this.store.readApplications(range)),
      readKpi(window, (range) => this.store.readInterviews(range)),
      readKpi(window, (range) => this.store.readAtsScans(range)),
    ]);

    return {
      applications,
      atsScans,
      cvGenerated: documentKpi("cv_generation"),
      cvImported: documentKpi("cv_import"),
      interviews,
      lettersGenerated: documentKpi("letter_generation"),
    };
  }
}

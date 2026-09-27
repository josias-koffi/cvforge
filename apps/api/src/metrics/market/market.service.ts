import type { MarketMetrics } from "@cvforge/types";
import { toWindowDto, type ResolvedWindow } from "../shared/metrics-window";
import type { PgMarketStore } from "./market.pg-store";

/** The "Marché" tab: the employers and jobs the platform sees demand for. */
export class MarketMetricsService {
  constructor(private readonly store: PgMarketStore) {}

  async read(window: ResolvedWindow): Promise<MarketMetrics> {
    const range = window.current;
    const [
      topCompanies,
      topJobTitles,
      topTargetRoles,
      topCheckedCompanies,
      topSearchedJobs,
      dailyOffers,
      topAppliedCompanies,
    ] = await Promise.all([
      this.store.readTopCompanies(range),
      this.store.readTopJobTitles(range),
      this.store.readTopTargetRoles(),
      this.store.readTopCheckedCompanies(range),
      this.store.readTopSearchedJobs(range),
      this.store.readDailyOffers(range),
      this.store.readTopAppliedCompanies(range),
    ]);

    return {
      dailyOffers,
      topAppliedCompanies,
      topCheckedCompanies,
      topCompanies,
      topJobTitles,
      topSearchedJobs,
      topTargetRoles,
      window: toWindowDto(window),
    };
  }
}

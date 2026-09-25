import type { RevenueMetrics } from "@cvforge/types";
import type { PgActivityStore } from "../shared/activity.pg-store";
import {
  percent,
  toWindowDto,
  type ResolvedWindow,
} from "../shared/metrics-window";
import { bucketDates, fillSeries, oldestDate } from "../shared/time-series";
import type { PgRevenueStore } from "./revenue.pg-store";

type RevenueReads = Pick<
  PgRevenueStore,
  | "readSales"
  | "readSalesSeries"
  | "readRepeatBuyers"
  | "readMedianDaysToFirstPurchase"
  | "readCheckouts"
  | "readFunnel"
  | "readOfferSales"
  | "readCredits"
>;

/** The "Revenus & conversion" tab: what came in, and how accounts get there. */
export class RevenueMetricsService {
  constructor(
    private readonly store: RevenueReads,
    private readonly activity: Pick<PgActivityStore, "readActiveUsers">,
  ) {}

  async read(window: ResolvedWindow): Promise<RevenueMetrics> {
    const sales = (range: ResolvedWindow["current"]) => this.store.readSales(range);
    const [kpis, series, repeat, median, checkouts, funnel, offers, credits] =
      await Promise.all([
        this.readKpis(window, sales),
        this.store.readSalesSeries(window.current, window.bucket),
        this.store.readRepeatBuyers(),
        this.store.readMedianDaysToFirstPurchase(window.current),
        this.store.readCheckouts(window.current),
        this.store.readFunnel(window.current),
        this.store.readOfferSales(window.current),
        this.store.readCredits(window.current),
      ]);
    const dates = bucketDates(window, oldestDate(series.revenueCents));

    return {
      abandonedCheckoutRate: percent(checkouts.abandoned, checkouts.opened),
      credits,
      funnel,
      kpis,
      medianDaysToFirstPurchase: median,
      offers,
      repeatBuyerRate: percent(repeat.repeat, repeat.buyers),
      series: fillSeries(dates, series),
      window: toWindowDto(window),
    };
  }

  private async readKpis(
    window: ResolvedWindow,
    sales: RevenueReads["readSales"],
  ): Promise<RevenueMetrics["kpis"]> {
    // One read of the sales per range feeds four figures.
    const [current, previous, activeNow, activeBefore] = await Promise.all([
      sales(window.current),
      window.previous ? sales(window.previous) : Promise.resolve(null),
      this.activity.readActiveUsers(window.current),
      window.previous
        ? this.activity.readActiveUsers(window.previous)
        : Promise.resolve(null),
    ]);
    const basket = (totals: { revenueCents: number; orders: number }) =>
      totals.orders > 0 ? Math.round(totals.revenueCents / totals.orders) : 0;
    const perActive = (revenueCents: number, active: number) =>
      active > 0 ? Math.round(revenueCents / active) : 0;

    return {
      averageBasketCents: {
        previous: previous ? basket(previous) : null,
        value: basket(current),
      },
      buyers: { previous: previous?.buyers ?? null, value: current.buyers },
      paidOrders: { previous: previous?.orders ?? null, value: current.orders },
      revenueCents: {
        previous: previous?.revenueCents ?? null,
        value: current.revenueCents,
      },
      revenuePerActiveCents: {
        previous:
          previous && activeBefore !== null
            ? perActive(previous.revenueCents, activeBefore)
            : null,
        value: perActive(current.revenueCents, activeNow),
      },
    };
  }
}

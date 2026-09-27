import { describe, expect, it } from "vitest";
import { resolveWindow } from "./metrics-window";
import { bucketDates, bucketStart, fillSeries, oldestDate } from "./time-series";

const NOW = new Date("2026-09-25T15:30:00.000Z"); // a Friday

describe("bucketStart", () => {
  it("starts weeks on Monday and months on the 1st, in UTC", () => {
    expect(bucketStart(NOW, "week").toISOString()).toBe("2026-09-21T00:00:00.000Z");
    expect(bucketStart(NOW, "month").toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(bucketStart(NOW, "day").toISOString()).toBe("2026-09-25T00:00:00.000Z");
  });
});

describe("bucketDates", () => {
  it("gives one point per day of the period, today last", () => {
    const dates = bucketDates(resolveWindow("7", NOW));

    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-09-19");
    expect(dates.at(-1)).toBe("2026-09-25");
  });

  it("starts the whole history at its oldest data point, or today", () => {
    const window = resolveWindow("all", NOW);

    expect(bucketDates(window, "2026-07-14")).toEqual(["2026-07-01", "2026-08-01", "2026-09-01"]);
    expect(bucketDates(window)).toEqual(["2026-09-01"]);
  });
});

describe("fillSeries", () => {
  it("lines series up on the buckets with zeros where nothing happened", () => {
    expect(
      fillSeries(["2026-09-24", "2026-09-25"], {
        orders: [{ date: "2026-09-25", value: 2 }],
        revenueCents: [{ date: "2026-09-24", value: 500 }],
      }),
    ).toEqual([
      { date: "2026-09-24", orders: 0, revenueCents: 500 },
      { date: "2026-09-25", orders: 2, revenueCents: 0 },
    ]);
  });

  it("finds the oldest date across series", () => {
    expect(oldestDate([{ date: "2026-09-02", value: 1 }], [{ date: "2026-08-30", value: 1 }])).toBe("2026-08-30");
    expect(oldestDate([])).toBeNull();
  });
});

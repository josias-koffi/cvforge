import { describe, expect, it } from "vitest";
import { parsePeriod, percent, rangeDays, readKpi, resolveWindow } from "./metrics-window";

const NOW = new Date("2026-09-25T15:30:00.000Z");

describe("resolveWindow", () => {
  it("counts today and the days before it from midnight UTC", () => {
    const window = resolveWindow("7", NOW);

    expect(window.current.from?.toISOString()).toBe("2026-09-19T00:00:00.000Z");
    expect(window.previous).toEqual({
      from: new Date("2026-09-12T00:00:00.000Z"),
      to: new Date("2026-09-19T00:00:00.000Z"),
    });
    expect(window.bucket).toBe("day");
  });

  it("cuts a year in weeks and the whole history in months, with nothing before it", () => {
    expect(resolveWindow("365", NOW).bucket).toBe("week");
    expect(resolveWindow("all", NOW)).toMatchObject({
      bucket: "month",
      current: { from: null, to: null },
      previous: null,
    });
  });
});

describe("parsePeriod", () => {
  it("keeps a known period and falls back to 30 days otherwise", () => {
    expect(parsePeriod("90")).toBe("90");
    expect(parsePeriod("forever")).toBe("30");
    expect(parsePeriod(undefined)).toBe("30");
  });
});

describe("readKpi", () => {
  it("reads both periods, and no previous one for the whole history", async () => {
    const read = async (range: { from: Date | null }) => (range.from ? 2 : 5);

    await expect(readKpi(resolveWindow("7", NOW), read)).resolves.toEqual({ previous: 2, value: 2 });
    await expect(readKpi(resolveWindow("all", NOW), read)).resolves.toEqual({ previous: null, value: 5 });
  });
});

describe("percent and rangeDays", () => {
  it("rounds to a decimal and stays null over nothing", () => {
    expect(percent(1, 3)).toBe(33.3);
    expect(percent(1, 0)).toBeNull();
  });

  it("measures an open range up to now, or from a fallback start", () => {
    expect(rangeDays(resolveWindow("7", NOW).current, NOW, null)).toBe(7);
    expect(rangeDays({ from: null, to: null }, NOW, null)).toBeNull();
    expect(rangeDays({ from: null, to: null }, NOW, new Date("2026-09-20T15:30:00.000Z"))).toBe(5);
  });
});

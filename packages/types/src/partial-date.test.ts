import { describe, expect, it } from "vitest";
import {
  comparePartialDate,
  formatPartialDate,
  formatPeriod,
  legacyToPartialDate,
  parsePartialDate,
  resolveDateText,
  resolvePeriodText,
} from "./partial-date";

describe("parsePartialDate", () => {
  it("accepts year, month and day precision", () => {
    expect(parsePartialDate("2022")).toEqual({ year: 2022 });
    expect(parsePartialDate("2022-03")).toEqual({ year: 2022, month: 3 });
    expect(parsePartialDate("2022-03-15")).toEqual({
      year: 2022,
      month: 3,
      day: 15,
    });
  });

  it("rejects invalid values", () => {
    for (const value of [
      "",
      "Jan. 2022",
      "2022-13",
      "2023-02-30",
      "1800",
      "22",
    ]) {
      expect(parsePartialDate(value)).toBeNull();
    }
  });
});

describe("formatPartialDate", () => {
  it("formats per locale", () => {
    expect(formatPartialDate("2022", "fr")).toBe("2022");
    expect(formatPartialDate("2022-03", "fr")).toBe("mars 2022");
    expect(formatPartialDate("2022-03-15", "fr")).toBe("15/03/2022");
    expect(formatPartialDate("2022-03", "en")).toBe("Mar 2022");
    expect(formatPartialDate("2022-03-15", "en")).toBe("Mar 15, 2022");
  });

  it("returns an empty string for free text", () => {
    expect(formatPartialDate("Jan. 2022", "fr")).toBe("");
  });
});

describe("formatPeriod", () => {
  it("handles ongoing and partial periods", () => {
    expect(formatPeriod({ start: "2022-03", current: true }, "fr")).toBe(
      "mars 2022 – Présent",
    );
    expect(formatPeriod({ start: "2019", end: "2021" }, "en")).toBe(
      "2019 – 2021",
    );
    expect(formatPeriod({ start: "2019" }, "en")).toBe("2019");
  });
});

describe("legacy compatibility", () => {
  it("keeps the free text when there is no structured value", () => {
    expect(resolveDateText(undefined, "Printemps 2020", "fr")).toBe(
      "Printemps 2020",
    );
    expect(resolveDateText("2020-04", "Printemps 2020", "en")).toBe("Apr 2020");
    expect(resolvePeriodText({}, "Jan. 2020", "Présent", "fr")).toEqual({
      start: "Jan. 2020",
      end: "Présent",
    });
  });

  it("parses only unambiguous legacy dates", () => {
    expect(legacyToPartialDate("2021")).toBe("2021");
    expect(legacyToPartialDate("03/2021")).toBe("2021-03");
    expect(legacyToPartialDate("15/03/2021")).toBe("2021-03-15");
    expect(legacyToPartialDate("Jan. 2022")).toBe("2022-01");
    expect(legacyToPartialDate("mars 2022")).toBe("2022-03");
    expect(legacyToPartialDate("Printemps 2020")).toBeNull();
    expect(legacyToPartialDate("2020-2023")).toBeNull();
  });
});

describe("comparePartialDate", () => {
  it("orders chronologically", () => {
    expect(comparePartialDate("2020", "2021-01")).toBeLessThan(0);
    expect(comparePartialDate("2021-05", "2021-02")).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { headcountLabel } from "./companies";

describe("headcountLabel", () => {
  it.each([
    ["01", "1 ou 2 salariés", "1–2 employees"],
    ["22", "100 à 199 salariés", "100–199 employees"],
    ["51", "2 000 à 4 999 salariés", "2,000–4,999 employees"],
    ["53", "10 000 salariés et plus", "10,000+ employees"],
  ])("words band %s in both languages", (band, fr, en) => {
    expect(headcountLabel(band)).toBe(fr);
    expect(headcountLabel(band, "en")).toBe(en);
  });

  it("says nothing for a band INSEE does not publish", () => {
    expect(headcountLabel("NN")).toBe("");
    expect(headcountLabel("")).toBe("");
  });
});

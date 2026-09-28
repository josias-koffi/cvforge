import { describe, expect, it } from "vitest";
import { foldPlural } from "./morphology";

describe("foldPlural", () => {
  it("folds a plural onto its singular", () => {
    expect(foldPlural("kpis")).toBe(foldPlural("kpi"));
    expect(foldPlural("newsletters")).toBe("newsletter");
    expect(foldPlural("reseaux")).toBe("reseau");
  });

  it("leaves a word ending in -ss alone", () => {
    expect(foldPlural("process")).toBe("process");
  });

  it("leaves short words alone", () => {
    expect(foldPlural("bus")).toBe("bus");
  });
});

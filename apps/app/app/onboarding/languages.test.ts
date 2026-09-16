import { describe, expect, it } from "vitest";
import { parseOnboardingLanguages } from "./languages";

describe("parseOnboardingLanguages", () => {
  it("reads the format the onboarding placeholder suggests", () => {
    expect(parseOnboardingLanguages("Francais C2, Anglais B2")).toEqual([
      { language: "Francais", level: "C2" },
      { language: "Anglais", level: "B2" },
    ]);
  });

  it("accepts the separators people actually type", () => {
    expect(
      parseOnboardingLanguages("Anglais - C1; Espagnol : courant\nItalien (notions)"),
    ).toEqual([
      { language: "Anglais", level: "C1" },
      { language: "Espagnol", level: "courant" },
      { language: "Italien", level: "notions" },
    ]);
  });

  it("keeps a multi-word level with the language it follows", () => {
    expect(parseOnboardingLanguages("Français langue maternelle")).toEqual([
      { language: "Français", level: "langue maternelle" },
    ]);
  });

  it("leaves the level empty rather than guessing one", () => {
    expect(parseOnboardingLanguages("Allemand")).toEqual([
      { language: "Allemand", level: "" },
    ]);
  });

  it("keeps a multi-word language intact when a level follows", () => {
    expect(parseOnboardingLanguages("Chinois mandarin B1")).toEqual([
      { language: "Chinois mandarin", level: "B1" },
    ]);
  });

  it("ignores blank entries and stray separators", () => {
    expect(parseOnboardingLanguages(" , Anglais C1 ,, ")).toEqual([
      { language: "Anglais", level: "C1" },
    ]);
  });

  it("returns nothing when the candidate skipped the field", () => {
    expect(parseOnboardingLanguages("")).toEqual([]);
  });
});

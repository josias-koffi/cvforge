import { describe, expect, it } from "vitest";
import {
  containsTokenSequence,
  extractNumbers,
  extractYears,
  normalizeText,
  tokenize,
} from "./text-normalize";

describe("normalizeText", () => {
  it("ignores case and diacritics", () => {
    expect(normalizeText("Modélisation")).toBe(normalizeText("modelisation"));
    expect(normalizeText("React")).toBe(normalizeText("react"));
  });

  it("keeps tool names whose meaning lives in punctuation distinct", () => {
    expect(normalizeText("C++")).toBe("cplusplus");
    expect(normalizeText("C#")).toBe("csharp");
    expect(normalizeText(".NET")).toBe("dotnet");
    expect(normalizeText("Node.js")).toBe("nodejs");
    expect(normalizeText("C++")).not.toBe(normalizeText("C#"));
  });
});

describe("containsTokenSequence", () => {
  it("does not match a token that is merely a prefix of another", () => {
    expect(containsTokenSequence(tokenize("JavaScript"), tokenize("Java"))).toBe(
      false,
    );
  });

  it("allows narrowing but not widening", () => {
    expect(
      containsTokenSequence(tokenize("React Native"), tokenize("React")),
    ).toBe(true);
    expect(
      containsTokenSequence(tokenize("React"), tokenize("React Native")),
    ).toBe(false);
  });

  it("requires the tokens to be contiguous", () => {
    expect(
      containsTokenSequence(
        tokenize("Google Analytics et Cloud Storage"),
        tokenize("Google Cloud"),
      ),
    ).toBe(false);
  });
});

describe("number extraction", () => {
  it("reads four-digit years only", () => {
    expect(extractYears("Jan. 2021 – Déc. 2023")).toEqual(["2021", "2023"]);
    expect(extractYears("équipe de 40 personnes")).toEqual([]);
  });

  it("normalises decimal separators so 1,5 and 1.5 compare equal", () => {
    expect(extractNumbers("croissance de 1,5 M€")).toEqual(["1.5"]);
  });
});

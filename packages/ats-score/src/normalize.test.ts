import { describe, expect, it } from "vitest";
import {
  awardPoints,
  clamp,
  countWords,
  extractKeywords,
  normalizeToken,
  toScore,
} from "./normalize";
import { bandFor } from "./weights";

describe("normalizeToken", () => {
  it("folds accents so 'Éthique' matches 'ethique'", () => {
    expect(normalizeToken("Éthique")).toBe(normalizeToken("ethique"));
  });

  it("replaces punctuation with space rather than joining words", () => {
    expect(normalizeToken("node.js/react").split(/\s+/)).toEqual([
      "node",
      "js",
      "react",
    ]);
  });
});

describe("extractKeywords", () => {
  it("keeps tokens of four characters or more", () => {
    expect(extractKeywords(["un via rest api docker"])).toEqual([
      "rest",
      "docker",
    ]);
  });

  it("deduplicates across every source string", () => {
    expect(extractKeywords(["Docker", "docker compose"])).toEqual([
      "docker",
      "compose",
    ]);
  });

  it("tolerates null and undefined entries", () => {
    expect(extractKeywords([null, undefined, "kubernetes"])).toEqual([
      "kubernetes",
    ]);
  });
});

describe("countWords", () => {
  it("ignores the whitespace around and between words", () => {
    expect(countWords("  deux   mots  ")).toBe(2);
  });

  it("counts an empty string as zero rather than one", () => {
    expect(countWords("")).toBe(0);
  });
});

describe("clamp and toScore", () => {
  it("bounds a value to its range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
    expect(clamp(7, 0, 10)).toBe(7);
  });

  it("rounds to an integer and clamps to 0-100", () => {
    expect(toScore(87.5)).toBe(88);
    expect(toScore(-3)).toBe(0);
    expect(toScore(140)).toBe(100);
  });
});

describe("awardPoints", () => {
  it("adds only the points of the rules that passed", () => {
    expect(
      awardPoints([
        { passed: true, points: 30 },
        { passed: false, points: 50 },
        { passed: true, points: 20 },
      ]),
    ).toBe(50);
  });

  it("returns zero when nothing passes", () => {
    expect(awardPoints([{ passed: false, points: 100 }])).toBe(0);
  });
});

describe("bandFor", () => {
  it("names each band by its floor", () => {
    expect(bandFor(100)).toBe("excellent");
    expect(bandFor(85)).toBe("excellent");
    expect(bandFor(84)).toBe("good");
    expect(bandFor(70)).toBe("good");
    expect(bandFor(69)).toBe("fair");
    expect(bandFor(50)).toBe("fair");
    expect(bandFor(49)).toBe("weak");
    expect(bandFor(0)).toBe("weak");
  });

  it("falls back to the lowest band for an out-of-range score", () => {
    expect(bandFor(-1)).toBe("weak");
  });
});

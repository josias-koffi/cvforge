import { describe, expect, it } from "vitest";
import { nonEmpty, parseMaxAttempts, parseModelList } from "./openrouter.env";

describe("nonEmpty", () => {
  it("treats undefined, blank and whitespace alike as unset", () => {
    expect(nonEmpty(undefined)).toBeUndefined();
    expect(nonEmpty("")).toBeUndefined();
    expect(nonEmpty("   ")).toBeUndefined();
  });

  it("trims a real value", () => {
    expect(nonEmpty("  a/b  ")).toBe("a/b");
  });
});

describe("parseModelList", () => {
  const defaults = ["a/one", "b/two"];

  it("falls back to the defaults when blank, since compose empties unset vars", () => {
    expect(parseModelList(undefined, defaults)).toEqual(defaults);
    expect(parseModelList("", defaults)).toEqual(defaults);
    expect(parseModelList("  ", defaults)).toEqual(defaults);
  });

  it("treats the literal `none` as an explicit opt-out, whatever its case", () => {
    expect(parseModelList("none", defaults)).toEqual([]);
    expect(parseModelList("NONE", defaults)).toEqual([]);
  });

  it("splits a CSV list, trimming entries and dropping empty ones", () => {
    expect(parseModelList(" x/one , , y/two ", defaults)).toEqual([
      "x/one",
      "y/two",
    ]);
  });
});

describe("parseMaxAttempts", () => {
  it("falls back on anything that is not a positive integer", () => {
    for (const raw of [undefined, "", "zero", "0", "-1", "2.5"]) {
      expect(parseMaxAttempts(raw, 3)).toBe(3);
    }
  });

  it("keeps a positive integer", () => {
    expect(parseMaxAttempts("5", 3)).toBe(5);
  });
});

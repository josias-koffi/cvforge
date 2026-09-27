import { describe, expect, it } from "vitest";
import {
  columnSuspicion,
  mojibakeRatio,
  type PositionedTextItem,
} from "./pdf-signals";

const PAGE_WIDTH = 600;

/** pdfjs hands back a text matrix; only x (index 4) and y (index 5) matter here. */
function item(
  str: string,
  x: number,
  y: number,
  width = str.length * 5,
): PositionedTextItem {
  return { str, transform: [1, 0, 0, 1, x, y], width };
}

/** One line of prose, split into fragments the way pdfjs actually reports it. */
function proseLine(y: number): PositionedTextItem[] {
  return [item("Réduit le temps de build", 72, y), item("de 40%.", 200, y)];
}

/** The same line, with a second column starting far to the right. */
function twoColumnLine(y: number): PositionedTextItem[] {
  return [item("Expérience", 72, y), item("Compétences", 400, y)];
}

describe("columnSuspicion", () => {
  it("is zero for a single-column page", () => {
    const items = [...proseLine(700), ...proseLine(680), ...proseLine(660)];

    expect(columnSuspicion(items, PAGE_WIDTH)).toBe(0);
  });

  it("rises when lines are split by a gap wide enough to be a column break", () => {
    const items = [
      ...twoColumnLine(700),
      ...twoColumnLine(680),
      ...twoColumnLine(660),
    ];

    expect(columnSuspicion(items, PAGE_WIDTH)).toBe(1);
  });

  it("reports the share of split lines, not merely that one exists", () => {
    const items = [
      ...twoColumnLine(700),
      ...proseLine(680),
      ...proseLine(660),
      ...proseLine(640),
    ];

    expect(columnSuspicion(items, PAGE_WIDTH)).toBe(0.25);
  });

  /** Fragments a couple of units apart are one line, not one line each. */
  it("groups fragments of the same line together", () => {
    const items = [item("Expérience", 72, 700), item("Compétences", 400, 701)];

    expect(columnSuspicion(items, PAGE_WIDTH)).toBe(1);
  });

  it("ignores blank fragments and items with no position", () => {
    const items: PositionedTextItem[] = [
      ...proseLine(700),
      { str: "   ", transform: [1, 0, 0, 1, 400, 700] },
      { str: "orphelin" },
    ];

    expect(columnSuspicion(items, PAGE_WIDTH)).toBe(0);
  });

  it("returns zero rather than dividing by an unknown page width", () => {
    expect(columnSuspicion(proseLine(700), 0)).toBe(0);
  });

  it("returns zero for a page with no text at all", () => {
    expect(columnSuspicion([], PAGE_WIDTH)).toBe(0);
  });
});

describe("mojibakeRatio", () => {
  it("is zero for clean, accented French", () => {
    expect(mojibakeRatio("Ingénieur plateforme, huit ans d'expérience.")).toBe(
      0,
    );
  });

  it("counts replacement glyphs left by a broken encoding", () => {
    expect(mojibakeRatio("Ing�nieur")).toBeGreaterThan(0);
  });

  it("counts control characters", () => {
    expect(mojibakeRatio("Ingnieur")).toBeGreaterThan(0);
  });

  it("does not count tabs, which are legitimate spacing", () => {
    expect(mojibakeRatio("Nom\tDate")).toBe(0);
  });

  /** Whitespace is out of the denominator: a spacious CV is not a cleaner one. */
  it("ignores whitespace when measuring the share", () => {
    expect(mojibakeRatio("ab�")).toBe(mojibakeRatio("a b �"));
  });

  it("is zero for an empty or blank string", () => {
    expect(mojibakeRatio("")).toBe(0);
    expect(mojibakeRatio("   \n  ")).toBe(0);
  });
});

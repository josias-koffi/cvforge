/**
 * The layout signals an ATS cares about, derived from a PDF's text items.
 *
 * Kept free of pdfjs so the arithmetic can be tested against plain objects
 * rather than hand-built PDFs: only the shape of an item is borrowed.
 */

export type PositionedTextItem = {
  str?: string;
  /** pdfjs text matrix; [4] is x, [5] is y, both in PDF user space. */
  transform?: number[];
  width?: number;
};

export type PdfTextExtraction = {
  text: string;
  /** False for a scanned page: an image of a CV, which an ATS reads as blank. */
  hasTextLayer: boolean;
  pageCount: number;
  /** 0-1. Share of lines split by a gap wide enough to read as a column break. */
  columnSuspicion: number;
  /** 0-1. Share of characters that survived extraction as garbage. */
  mojibakeRatio: number;
};

/** Lines closer than this in user space are the same line of text. */
const LINE_TOLERANCE = 2;
/** A gap this wide, relative to the page, separates columns rather than words. */
const COLUMN_GAP_RATIO = 0.15;

/**
 * How strongly the text order suggests columns.
 *
 * A two-column CV extracts as interleaved fragments — the ATS reads the left
 * column's first line, then the right column's, and the career becomes
 * nonsense. The giveaway is a wide horizontal gap inside a line, repeated down
 * the page.
 */
export function columnSuspicion(
  items: PositionedTextItem[],
  pageWidth: number,
): number {
  if (pageWidth <= 0) return 0;

  const lines = groupIntoLines(items);

  if (lines.length === 0) return 0;

  const split = lines.filter((line) => hasColumnGap(line, pageWidth)).length;

  return round2(split / lines.length);
}

/**
 * Groups fragments into lines by walking them top-down and starting a new line
 * only once the vertical distance exceeds the tolerance.
 *
 * Deliberately not a rounded-grid key: two fragments two units apart can fall
 * on either side of a grid boundary and be torn into separate lines, which is
 * exactly the case a two-column header hits.
 */
function groupIntoLines(items: PositionedTextItem[]) {
  const positioned = items
    .filter(
      (item) =>
        item.transform !== undefined && (item.str ?? "").trim().length > 0,
    )
    .sort((a, b) => yOf(b) - yOf(a));

  const lines: PositionedTextItem[][] = [];
  let anchor: number | null = null;

  for (const item of positioned) {
    if (anchor === null || anchor - yOf(item) > LINE_TOLERANCE) {
      anchor = yOf(item);
      lines.push([item]);
      continue;
    }

    lines.at(-1)?.push(item);
  }

  return lines;
}

function yOf(item: PositionedTextItem) {
  return item.transform?.[5] ?? 0;
}

function hasColumnGap(line: PositionedTextItem[], pageWidth: number) {
  const sorted = [...line].sort((a, b) => xOf(a) - xOf(b));
  const threshold = pageWidth * COLUMN_GAP_RATIO;

  return sorted.some((item, index) => {
    if (index === 0) return false;

    const previous = sorted[index - 1]!;
    const gap = xOf(item) - (xOf(previous) + (previous.width ?? 0));

    return gap > threshold;
  });
}

function xOf(item: PositionedTextItem) {
  return item.transform?.[4] ?? 0;
}

/**
 * Characters that came out of extraction as garbage: replacement glyphs and
 * control codes, which is what a broken font encoding leaves behind.
 *
 * Whitespace and newlines are excluded from the denominator — a well-spaced CV
 * would otherwise look cleaner than a dense one for no reason.
 */
export function mojibakeRatio(text: string): number {
  const meaningful = [...text].filter((char) => !/\s/.test(char));

  if (meaningful.length === 0) return 0;

  const garbled = meaningful.filter(isGarbled).length;

  return round2(garbled / meaningful.length);
}

function isGarbled(char: string) {
  const code = char.codePointAt(0) ?? 0;

  // U+FFFD is the decoder giving up; C0/C1 controls never belong in a CV.
  return (
    char === "�" ||
    (code < 0x20 && code !== 0x09) ||
    (code >= 0x7f && code <= 0x9f)
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

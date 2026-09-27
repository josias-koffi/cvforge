import { describe, expect, it } from "vitest";
import { scoreAts } from "../engine";
import { makeDocument } from "../testing/make-document";
import type { AtsFileSignals } from "../types";

function makeFile(overrides: Partial<AtsFileSignals> = {}): AtsFileSignals {
  return {
    columnSuspicion: 0,
    hasTextLayer: true,
    kind: "pdf",
    mojibakeRatio: 0,
    pageCount: 2,
    ...overrides,
  };
}

function scoreFor(file: AtsFileSignals) {
  const dimension = scoreAts(makeDocument({ file })).dimensions.find(
    (item) => item.key === "machineReadability",
  );

  if (!dimension) throw new Error("machineReadability missing");

  return dimension;
}

function codesFor(file: AtsFileSignals) {
  return scoreAts(makeDocument({ file })).findings.map(
    (finding) => finding.code,
  );
}

describe("machineReadability", () => {
  it("becomes scoreable as soon as file signals are present", () => {
    const dimension = scoreFor(makeFile());

    expect(dimension.status).toBe("scored");
    expect(dimension.score).toBe(100);
  });

  it("stays unavailable for a document with no file behind it", () => {
    const dimension = scoreAts(makeDocument()).dimensions.find(
      (item) => item.key === "machineReadability",
    );

    expect(dimension?.status).toBe("unavailable");
    expect(dimension?.unavailableReason).toBe("NO_FILE_SIGNALS");
  });

  /**
   * The headline result of the whole feature: a scanned CV is an image, and an
   * ATS reads an image as a blank page.
   */
  it("collapses a PDF with no text layer to 30 or less", () => {
    expect(scoreFor(makeFile({ hasTextLayer: false })).score).toBeLessThanOrEqual(
      30,
    );
  });

  it("flags the missing text layer as critical", () => {
    expect(codesFor(makeFile({ hasTextLayer: false }))).toContain(
      "NO_TEXT_LAYER",
    );
  });

  /**
   * With no text layer, the column and glyph ratios come back at zero because
   * there was nothing to measure — reporting them would send the candidate
   * fixing a layout nobody observed.
   */
  it("does not diagnose layout defects it could not observe", () => {
    const codes = codesFor(
      makeFile({ columnSuspicion: 0, hasTextLayer: false, mojibakeRatio: 0 }),
    );

    expect(codes).toContain("NO_TEXT_LAYER");
    expect(codes).not.toContain("MULTI_COLUMN_LAYOUT");
    expect(codes).not.toContain("GARBLED_CHARACTERS");
  });

  /**
   * A scanned CV very probably has an experience section and an email — we
   * simply could not read them. Judging the empty extraction would tell the
   * candidate to fix things that are already there, and bury the one message
   * that matters.
   */
  describe("when nothing could be read from the file", () => {
    const scanned = makeDocument({ file: makeFile({ hasTextLayer: false }) });

    it("judges readability alone and excludes every content dimension", () => {
      const result = scoreAts(scanned);

      const scored = result.dimensions.filter(
        (item) => item.status === "scored",
      );

      expect(scored.map((item) => item.key)).toEqual(["machineReadability"]);
    });

    it("says the text layer is missing, and nothing else", () => {
      expect(scoreAts(scanned).findings.map((finding) => finding.code)).toEqual([
        "NO_TEXT_LAYER",
      ]);
    });

    it("names the reason each content dimension could not be judged", () => {
      const structure = scoreAts(scanned).dimensions.find(
        (item) => item.key === "structure",
      );

      expect(structure?.status).toBe("unavailable");
      expect(structure?.unavailableReason).toBe("NO_TEXT_LAYER");
    });

    it("still scores it far below a readable CV", () => {
      const readable = scoreAts(makeDocument({ file: makeFile() })).overallScore;

      expect(scoreAts(scanned).overallScore).toBeLessThan(readable);
    });
  });

  it("flags a layout that reads as columns", () => {
    expect(codesFor(makeFile({ columnSuspicion: 0.6 }))).toContain(
      "MULTI_COLUMN_LAYOUT",
    );
  });

  it("tolerates the occasional wide gap inside a line", () => {
    expect(codesFor(makeFile({ columnSuspicion: 0.1 }))).not.toContain(
      "MULTI_COLUMN_LAYOUT",
    );
  });

  it("flags a CV longer than two pages", () => {
    expect(codesFor(makeFile({ pageCount: 5 }))).toContain("TOO_MANY_PAGES");
  });

  it("flags a broken font encoding", () => {
    expect(codesFor(makeFile({ mojibakeRatio: 0.2 }))).toContain(
      "GARBLED_CHARACTERS",
    );
  });

  it("tolerates a couple of odd glyphs", () => {
    expect(codesFor(makeFile({ mojibakeRatio: 0.01 }))).not.toContain(
      "GARBLED_CHARACTERS",
    );
  });

  it("bottoms out when every signal is bad at once", () => {
    const score = scoreFor(
      makeFile({
        columnSuspicion: 1,
        hasTextLayer: false,
        mojibakeRatio: 1,
        pageCount: 9,
      }),
    ).score;

    expect(score).toBe(0);
  });

  /** A scanned CV must be told apart from a clean one by the overall score too. */
  it("drags the overall score below that of the same CV with a text layer", () => {
    const readable = scoreAts(makeDocument({ file: makeFile() })).overallScore;
    const scanned = scoreAts(
      makeDocument({ file: makeFile({ hasTextLayer: false }) }),
    ).overallScore;

    expect(scanned).toBeLessThan(readable);
  });
});

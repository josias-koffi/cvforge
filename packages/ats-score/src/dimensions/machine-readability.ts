import { awardPoints } from "../normalize";
import type { AtsFileSignals, AtsFinding } from "../types";

/** Beyond this, an ATS truncates or a recruiter stops reading. */
const MAX_PAGES = 2;
/** Above this share of lines split by a wide gap, the layout reads as columns. */
const COLUMN_THRESHOLD = 0.2;
/** A couple of odd glyphs is normal; this much is a broken font encoding. */
const MOJIBAKE_THRESHOLD = 0.02;

/**
 * Whether a parser can read this file at all.
 *
 * The heaviest single rule in the whole engine, and deliberately so: a PDF with
 * no text layer is an image of a CV. It may be beautiful, and an ATS reads it
 * as a blank page — which is the most valuable thing the landing scan can tell
 * a candidate.
 */
export function scoreMachineReadability(file: AtsFileSignals) {
  const shortEnough = file.pageCount <= MAX_PAGES;

  // Both of these are measured *on the extracted text*. With no text layer they
  // come back at a flattering zero simply because there was nothing to measure
  // — an artefact of absence, not a well-built page. Crediting them would hand
  // a scanned CV half marks for a layout no parser will ever see.
  const singleColumn =
    file.hasTextLayer && file.columnSuspicion <= COLUMN_THRESHOLD;
  const cleanGlyphs =
    file.hasTextLayer && file.mojibakeRatio <= MOJIBAKE_THRESHOLD;

  const score = awardPoints([
    { passed: file.hasTextLayer, points: 40 },
    { passed: singleColumn, points: 20 },
    { passed: shortEnough, points: 15 },
    // Text in images is what OCR had to recover; no text layer means the whole
    // page was one.
    { passed: file.hasTextLayer, points: 10 },
    { passed: cleanGlyphs, points: 15 },
  ]);

  const findings: AtsFinding[] = [];

  if (!file.hasTextLayer) {
    findings.push({
      code: "NO_TEXT_LAYER",
      dimension: "machineReadability",
      severity: "critical",
    });
  }

  // Reported only when there was text to inspect: "no text layer" already says
  // everything, and claiming a column layout we never observed would send the
  // candidate fixing the wrong thing.
  if (file.hasTextLayer && !singleColumn) {
    findings.push({
      code: "MULTI_COLUMN_LAYOUT",
      dimension: "machineReadability",
      severity: "critical",
    });
  }

  if (!shortEnough) {
    findings.push({
      code: "TOO_MANY_PAGES",
      dimension: "machineReadability",
      severity: "warning",
    });
  }

  if (file.hasTextLayer && !cleanGlyphs) {
    findings.push({
      code: "GARBLED_CHARACTERS",
      dimension: "machineReadability",
      severity: "warning",
    });
  }

  return { findings, score };
}

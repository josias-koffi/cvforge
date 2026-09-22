import { awardPoints } from "../normalize";
import type { AtsDocument, AtsFinding } from "../types";

/**
 * Below this a CV reads as thin; above it, as an unfiltered career dump.
 *
 * Measured, not guessed: a CV with two roles and eight detailed bullets comes
 * out at ~200 words. An earlier 400-word floor flagged perfectly normal CVs as
 * too short.
 */
const MIN_WORDS = 250;
const MAX_WORDS = 900;
/**
 * Below this there is no career to read at all — a page of headings with
 * nothing under them. Distinct from "short", and raised as critical so it caps
 * the whole score: a three-line CV must not come out "perfectible" because its
 * contact details happen to be complete.
 */
const SKELETAL_WORDS = 150;
/** Share of experiences that must carry bullets for the CV to scan well. */
const BULLET_COVERAGE = 0.7;

/** Pipes and runs of tabs survive text extraction when a layout used tables. */
const TABLE_MARKER = /[|│]|\t{2,}/;
/** Three on one line, or any on two lines, is a grid rather than a separator. */
const PIPES_PER_LINE = 3;
const TABULAR_LINES = 2;

const DATE_PATTERNS = [
  /\b(0?[1-9]|1[0-2])\/(19|20)\d{2}\b/, // 09/2024
  /\b(19|20)\d{2}-(0?[1-9]|1[0-2])\b/, // 2024-09
  /\b(19|20)\d{2}\b/, // 2024
];

/**
 * The mechanical hygiene an ATS depends on: parsable and consistent dates,
 * bulleted achievements, a sane length, and no table scaffolding.
 */
export function scoreFormatHygiene(doc: AtsDocument) {
  const dates = collectDates(doc);
  const parsable = dates.filter((date) => matchedPattern(date) !== null);
  const datesUsable = dates.length > 0 && parsable.length === dates.length;
  const datesConsistent = datesUsable && usesOneFormat(parsable);
  const bulletsOk = hasEnoughBullets(doc);
  const lengthOk = doc.wordCount >= MIN_WORDS && doc.wordCount <= MAX_WORDS;
  // Only a document with text can earn credit for carrying no table markers;
  // otherwise an empty extraction collects points for a defect it had no room
  // to commit.
  const tableFree = doc.rawText.trim().length > 0 && !looksTabular(doc.rawText);

  const score = awardPoints([
    { points: 20, passed: datesUsable },
    { points: 15, passed: datesConsistent },
    { points: 25, passed: bulletsOk },
    { points: 25, passed: lengthOk },
    { points: 15, passed: tableFree },
  ]);

  const findings: AtsFinding[] = [];

  if (!datesUsable) {
    findings.push({
      code: "UNPARSABLE_DATES",
      dimension: "formatHygiene",
      severity: "critical",
    });
  } else if (!datesConsistent) {
    findings.push({
      code: "INCONSISTENT_DATE_FORMATS",
      dimension: "formatHygiene",
      severity: "warning",
    });
  }

  if (!bulletsOk) {
    findings.push({
      code: "FEW_BULLETS",
      dimension: "formatHygiene",
      severity: "warning",
    });
  }

  if (doc.wordCount < MIN_WORDS) {
    findings.push({
      code: "TOO_SHORT",
      dimension: "formatHygiene",
      severity: doc.wordCount < SKELETAL_WORDS ? "critical" : "warning",
    });
  } else if (doc.wordCount > MAX_WORDS) {
    findings.push({
      code: "TOO_LONG",
      dimension: "formatHygiene",
      severity: "info",
    });
  }

  if (!tableFree) {
    findings.push({
      code: "TABLE_MARKERS",
      dimension: "formatHygiene",
      severity: "warning",
    });
  }

  return { findings, score };
}

/**
 * A real table leaves its scaffolding on row after row. A single line reading
 * "email | téléphone | ville" is a header, not a grid — flagging it would
 * penalise one of the most common and perfectly readable CV layouts there is.
 */
function looksTabular(rawText: string) {
  const lines = rawText.split(/\r?\n/).filter((line) => TABLE_MARKER.test(line));

  if (lines.length >= TABULAR_LINES) return true;

  return lines.some(
    (line) => (line.match(/[|│]/g)?.length ?? 0) >= PIPES_PER_LINE,
  );
}

function collectDates(doc: AtsDocument) {
  return doc.experiences
    .flatMap((experience) => [experience.startDate, experience.endDate])
    .map((date) => date.trim())
    .filter((date) => date.length > 0 && !isPresentMarker(date));
}

/** "Present" / "Aujourd'hui" is a valid end date, not an unparsable one. */
function isPresentMarker(value: string) {
  return /^(present|présent|aujourd|current|now|en cours)/i.test(value);
}

function matchedPattern(value: string) {
  const index = DATE_PATTERNS.findIndex((pattern) => pattern.test(value));

  return index === -1 ? null : index;
}

function usesOneFormat(dates: string[]) {
  return new Set(dates.map(matchedPattern)).size <= 1;
}

/** No experiences means nothing to bullet — the structure score already says so. */
function hasEnoughBullets(doc: AtsDocument) {
  if (doc.experiences.length === 0) return false;

  const withBullets = doc.experiences.filter(
    (experience) => experience.bullets.length > 0,
  ).length;

  return withBullets / doc.experiences.length >= BULLET_COVERAGE;
}

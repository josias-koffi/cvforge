import { awardPoints } from "../normalize";
import type { AtsDocument, AtsFinding } from "../types";

/**
 * Whether the document exposes the sections an ATS parser looks for, and in a
 * plausible order. A CV can be beautifully written and still be unreadable to
 * a machine that cannot find where the experience starts.
 */
export function scoreStructure(doc: AtsDocument) {
  const { sections } = doc;

  const score = awardPoints([
    { points: 30, passed: sections.experience },
    { points: 20, passed: sections.education },
    { points: 20, passed: sections.skills },
    { points: 10, passed: sections.summary },
    { points: 5, passed: sections.languages },
    { points: 5, passed: sections.certifications },
    { points: 10, passed: hasReverseChronology(doc) },
  ]);

  const findings: AtsFinding[] = [];

  if (!sections.experience) {
    findings.push({
      code: "MISSING_EXPERIENCE_SECTION",
      dimension: "structure",
      severity: "critical",
    });
  }

  if (!sections.education) {
    findings.push({
      code: "MISSING_EDUCATION_SECTION",
      dimension: "structure",
      severity: "warning",
    });
  }

  if (!sections.skills) {
    findings.push({
      code: "MISSING_SKILLS_SECTION",
      dimension: "structure",
      severity: "critical",
    });
  }

  if (!sections.summary) {
    findings.push({
      code: "MISSING_SUMMARY_SECTION",
      dimension: "structure",
      severity: "info",
    });
  }

  return { findings, score };
}

/**
 * Most recent first. Undated or single experiences are given the benefit of the
 * doubt — the date rules of `formatHygiene` already penalise missing dates, and
 * charging twice for one defect makes a score hard to explain.
 *
 * A CV with no experience at all earns nothing here: crediting the absence of
 * a defect in a section that does not exist is how an empty document scores
 * points it has not earned.
 */
function hasReverseChronology(doc: AtsDocument) {
  if (doc.experiences.length === 0) return false;

  const years = doc.experiences
    .map((experience) => startYear(experience.startDate))
    .filter((year): year is number => year !== null);

  if (years.length < 2) return true;

  return years.every(
    (year, index) => index === 0 || years[index - 1]! >= year,
  );
}

function startYear(value: string) {
  const match = /(19|20)\d{2}/.exec(value);

  return match ? Number(match[0]) : null;
}

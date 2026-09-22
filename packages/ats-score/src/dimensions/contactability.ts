import { awardPoints } from "../normalize";
import type { AtsDocument, AtsFinding } from "../types";

/**
 * Whether a recruiter's system can route this candidate anywhere. An ATS that
 * parses a flawless CV and finds no email files it as unreachable — this is the
 * cheapest defect to fix and the most expensive to leave.
 */
export function scoreContactability(doc: AtsDocument) {
  const { contact } = doc;

  const score = awardPoints([
    { points: 30, passed: contact.email },
    { points: 25, passed: contact.phone },
    { points: 20, passed: contact.linkedIn },
    { points: 15, passed: contact.city },
    { points: 10, passed: contact.portfolio },
  ]);

  const findings: AtsFinding[] = [];

  if (!contact.email) {
    findings.push({
      code: "MISSING_EMAIL",
      dimension: "contactability",
      severity: "critical",
    });
  }

  if (!contact.phone) {
    findings.push({
      code: "MISSING_PHONE",
      dimension: "contactability",
      severity: "warning",
    });
  }

  if (!contact.linkedIn) {
    findings.push({
      code: "MISSING_LINKEDIN",
      dimension: "contactability",
      severity: "info",
    });
  }

  if (!contact.city) {
    findings.push({
      code: "MISSING_CITY",
      dimension: "contactability",
      severity: "info",
    });
  }

  return { findings, score };
}

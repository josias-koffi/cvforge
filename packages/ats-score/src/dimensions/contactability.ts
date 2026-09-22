import { awardPoints } from "../normalize";
import type { AtsDocument, AtsFinding } from "../types";

/**
 * Whether a recruiter's system can route this candidate anywhere. An ATS that
 * parses a flawless CV and finds no email files it as unreachable — this is the
 * cheapest defect to fix and the most expensive to leave.
 */
export function scoreContactability(doc: AtsDocument) {
  const { contact } = doc;

  /**
   * Weighted by what an ATS actually routes on. Email and phone are the fields
   * it parses into the candidate record; a profile URL is a bonus a recruiter
   * may click. Giving LinkedIn and a portfolio 30 points between them docked a
   * third of this dimension from every candidate who is not a developer with a
   * public GitHub.
   */
  const score = awardPoints([
    { points: 40, passed: contact.email },
    { points: 30, passed: contact.phone },
    { points: 15, passed: contact.city },
    { points: 10, passed: contact.linkedIn },
    { points: 5, passed: contact.portfolio },
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

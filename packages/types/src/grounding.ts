export type GroundingRemovalKind =
  | "skill"
  | "language"
  | "experience"
  | "education"
  | "certification"
  | "project"
  | "achievement";

export interface GroundingRemoval {
  /** Which part of the document the element was removed from. */
  kind: GroundingRemovalKind;
  /** The exact wording that was dropped, shown to the candidate as-is. */
  label: string;
  /** Where it came from, e.g. the company of the experience it belonged to. */
  context?: string;
}

/**
 * What the server removed from a generated document because the base profile
 * did not back it up. Surfaced in the editor so the candidate can add the
 * element to their profile when they genuinely have it.
 */
export interface GroundingReport {
  removals: GroundingRemoval[];
  /** Experiences whose company, role or dates were rewritten from the profile. */
  lockedExperiences: number;
  generatedAt: string;
}

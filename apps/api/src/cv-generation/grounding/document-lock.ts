import type {
  CertificationItemProps,
  EducationItemProps,
  GroundingRemoval,
  ProjectItemProps,
  PromptSafeProfileSections,
} from "@cvforge/types";
import { isSourcedTitle, type SourceIndex } from "./source-index";
import {
  containsTokenSequence,
  tokenOverlap,
  tokenize,
} from "./text-normalize";

type SourceEducation = PromptSafeProfileSections["education"][number];

const MATCH_THRESHOLD = 0.4;

function bestEducationMatch(
  source: SourceEducation,
  generated: EducationItemProps[],
  used: Set<number>,
) {
  let bestIndex = -1;
  let bestScore = MATCH_THRESHOLD;

  generated.forEach((item, index) => {
    if (used.has(index)) return;
    // "Sorbonne" should still match a generated "Sorbonne University".
    const institutionTokens = tokenize(item.institution);
    const sourceInstitution = tokenize(source.institution);
    const sameSchool =
      sourceInstitution.length > 0 &&
      containsTokenSequence(institutionTokens, sourceInstitution);

    const score = Math.max(
      tokenOverlap(tokenize(source.degree), tokenize(item.degree)),
      sameSchool ? 1 : 0,
    );
    if (score >= bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

/** Same rule as experiences: identity fields come from the profile, prose from the model. */
export function lockEducation(
  generated: EducationItemProps[],
  sources: SourceEducation[],
): { education: EducationItemProps[]; removals: GroundingRemoval[] } {
  const removals: GroundingRemoval[] = [];
  const used = new Set<number>();

  const education = sources.map((source) => {
    const index = bestEducationMatch(source, generated, used);
    if (index >= 0) used.add(index);
    const match = generated[index];

    return {
      degree: source.degree,
      description: match?.description ?? source.description ?? "",
      institution: source.institution,
      mention: source.honors,
      year: source.year,
    };
  });

  generated.forEach((item, index) => {
    if (used.has(index)) return;
    removals.push({
      kind: "education",
      label: [item.degree, item.institution].filter(Boolean).join(" — "),
    });
  });

  return { education, removals };
}

export function groundCertifications(
  generated: CertificationItemProps[],
  index: SourceIndex,
): { certifications: CertificationItemProps[]; removals: GroundingRemoval[] } {
  const removals: GroundingRemoval[] = [];
  const certifications = generated.filter((item) => {
    if (isSourcedTitle(item.title, index.certifications)) return true;
    removals.push({ kind: "certification", label: item.title });
    return false;
  });

  return { certifications, removals };
}

export function groundProjects(
  generated: ProjectItemProps[],
  index: SourceIndex,
): { projects: ProjectItemProps[]; removals: GroundingRemoval[] } {
  const removals: GroundingRemoval[] = [];
  const projects = generated.filter((item) => {
    if (isSourcedTitle(item.title, index.projects)) return true;
    removals.push({ kind: "project", label: item.title });
    return false;
  });

  return { projects, removals };
}

import type { CVDocumentContent, PromptSafeProfile } from "@cvforge/types";
import {
  groundCertifications,
  groundProjects,
  lockEducation,
} from "./document-lock";
import { lockExperiences } from "./experience-lock";
import { groundSkills } from "./skill-grounding";
import { buildSourceIndex } from "./source-index";

export * from "./source-index";
export * from "./text-normalize";

/**
 * Re-anchors a generated CV on the candidate's profile: anything the profile
 * does not back up is removed, and the identity of each experience and degree
 * is rewritten from the source. The model keeps the wording, never the facts.
 */
export function groundCvContent(
  content: CVDocumentContent,
  profile: PromptSafeProfile,
): CVDocumentContent {
  const index = buildSourceIndex(profile);
  const sections = profile.profileSections;

  const skills = groundSkills(
    content.skills.categories,
    content.skills.hard,
    index,
    profile,
  );
  const experiences = lockExperiences(content.experiences, sections.experiences);
  const education = lockEducation(content.education, sections.education);
  const certifications = groundCertifications(content.certifications, index);
  const projects = groundProjects(content.projects, index);

  const removals = [
    ...skills.removals,
    ...experiences.removals,
    ...education.removals,
    ...certifications.removals,
    ...projects.removals,
  ];

  return {
    ...content,
    candidate: {
      ...content.candidate,
      // The model has no language data at all, so any level it produces is invented.
      city: content.candidate.city || profile.identity.city,
    },
    certifications: certifications.certifications,
    education: education.education,
    experiences: experiences.experiences,
    grounding: {
      generatedAt: new Date().toISOString(),
      lockedExperiences: experiences.lockedExperiences,
      removals,
    },
    languages: [],
    projects: projects.projects,
    skills: {
      hard: skills.hard,
      soft: [],
      ...(skills.categories ? { categories: skills.categories } : {}),
    },
  };
}

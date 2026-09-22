import type { CVDocumentContent } from "@cvforge/types";
import { countWords } from "../normalize";
import type { AtsDocument, AtsExperience } from "../types";

/**
 * The in-app path: a CV we generated ourselves, already structured.
 *
 * Nothing is parsed here — sections exist or they do not, and every field is
 * where the schema says. The cost is that `machineReadability` has no file to
 * inspect, so the engine excludes it and renormalises; the benefit is a score
 * recomputed on every save for free.
 */
export function fromCvDocument(content: CVDocumentContent): AtsDocument {
  const experiences = content.experiences.map(toExperience);
  const skills = [...content.skills.hard, ...content.skills.soft];
  const rawText = buildText(content, experiences);

  return {
    bulletCount: experiences.reduce(
      (total, experience) => total + experience.bullets.length,
      0,
    ),
    contact: {
      city: isFilled(content.candidate.city),
      email: isFilled(content.candidate.email),
      linkedIn: isFilled(content.candidate.linkedin),
      phone: isFilled(content.candidate.phone),
      portfolio:
        isFilled(content.candidate.github) ||
        content.projects.some((project) => isFilled(project.url)),
    },
    educationCount: content.education.length,
    experiences,
    rawText,
    sections: {
      certifications: content.certifications.length > 0,
      education: content.education.length > 0,
      experience: experiences.length > 0,
      languages: content.languages.length > 0,
      skills: skills.length > 0,
      summary: isFilled(content.candidate.summary),
    },
    skills,
    wordCount: countWords(rawText),
  };
}

/**
 * `description` joins the achievements as a bullet: it is prose about the role
 * that the impact rules should judge alongside them, not silently ignored.
 */
function toExperience(
  experience: CVDocumentContent["experiences"][number],
): AtsExperience {
  const bullets = [...experience.achievements];

  if (isFilled(experience.description)) {
    bullets.unshift(experience.description.trim());
  }

  return {
    bullets: bullets.filter(isFilled),
    company: experience.company,
    endDate: experience.endDate,
    role: experience.position,
    startDate: experience.startDate,
  };
}

/**
 * A flat rendering of the document, so the rules that read prose (table
 * markers, word count, keyword matching) see the same surface they would on an
 * uploaded file.
 */
function buildText(content: CVDocumentContent, experiences: AtsExperience[]) {
  return [
    content.candidate.title,
    content.candidate.summary,
    ...experiences.flatMap((experience) => [
      experience.role,
      experience.company,
      ...experience.bullets,
    ]),
    ...content.education.map((entry) =>
      [entry.degree, entry.institution, entry.description].join(" "),
    ),
    ...content.skills.hard,
    ...content.skills.soft,
    ...content.certifications.map((entry) => entry.title),
    ...content.projects.map((entry) =>
      [entry.title, entry.description].join(" "),
    ),
    content.interests,
  ]
    .filter(isFilled)
    .join("\n");
}

function isFilled(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

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
  const evidenceText = buildEvidence(content, experiences);
  const rawText = buildText(content, experiences, skills);

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
    evidenceText,
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
 * The document as a page of text, the way a PDF text layer would hand it over.
 *
 * Everything that is printed is counted: the name, the contact line, the dates,
 * the diplomas, the languages. Rendering only the prose made `wordCount` mean
 * one thing here and another on the landing, and the length rule then read a
 * perfectly normal CV as too short purely because it had arrived structured.
 *
 * Separators are middots rather than pipes on purpose — a pipe is what
 * `formatHygiene` reads as table scaffolding.
 */
function buildText(
  content: CVDocumentContent,
  experiences: AtsExperience[],
  skills: string[],
) {
  const { candidate } = content;

  return [
    [candidate.firstName, candidate.lastName].filter(isFilled).join(" "),
    [candidate.email, candidate.phone, candidate.city, candidate.linkedin, candidate.github]
      .filter(isFilled)
      .join(" · "),
    buildEvidenceLines(content, experiences, true).join("\n"),
    skills.join(", "),
    content.languages
      .map((entry) => [entry.language, entry.level].filter(isFilled).join(" "))
      .join(", "),
  ]
    .filter(isFilled)
    .join("\n");
}

/**
 * A flat rendering of everything the candidate wrote *except* the skills list,
 * so the rules that read prose (table markers, word count, keyword matching)
 * see the same surface they would on an uploaded file — and so a claimed skill
 * can be checked against it without the list vouching for itself.
 */
function buildEvidence(
  content: CVDocumentContent,
  experiences: AtsExperience[],
) {
  return buildEvidenceLines(content, experiences, false).join("\n");
}

/** `dated` adds what a printed CV shows and prose does not: periods and years. */
function buildEvidenceLines(
  content: CVDocumentContent,
  experiences: AtsExperience[],
  dated: boolean,
) {
  return [
    content.candidate.title,
    content.candidate.summary,
    ...experiences.flatMap((experience) => [
      [
        experience.role,
        experience.company,
        ...(dated ? [experience.startDate, experience.endDate] : []),
      ]
        .filter(isFilled)
        .join(" "),
      ...experience.bullets,
    ]),
    ...content.education.map((entry) =>
      [
        entry.degree,
        entry.institution,
        ...(dated ? [entry.year, entry.mention] : []),
        entry.description,
      ]
        .filter(isFilled)
        .join(" "),
    ),
    ...content.certifications.map((entry) =>
      [entry.title, ...(dated ? [entry.issuer, entry.year] : [])]
        .filter(isFilled)
        .join(" "),
    ),
    ...content.projects.map((entry) =>
      [entry.title, entry.description].join(" "),
    ),
    content.interests,
  ].filter(isFilled);
}

function isFilled(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

import type {
  CVDocumentContent,
  LetterDocumentContent,
  Locale,
} from "@cvforge/types";
import {
  normalizeUpdatedCvContent,
  normalizeUpdatedLetterContent,
} from "./cv-generation.normalizers";

// Only the translatable parts are sent to the LLM: the candidate identity
// (name, contacts, links), the company and the signature never leave the API.

export type CvTranslatablePayload = Pick<
  CVDocumentContent,
  | "certifications"
  | "education"
  | "experiences"
  | "interests"
  | "languages"
  | "projects"
  | "skills"
> & { candidate: Pick<CVDocumentContent["candidate"], "summary" | "title"> };

export type LetterTranslatablePayload = Pick<
  LetterDocumentContent,
  "body" | "date" | "object"
> & { candidate: Pick<LetterDocumentContent["candidate"], "title"> };

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" ? (value as RawRecord) : {};
}

/** Uses the translated list only when the LLM kept every item. */
function sameLengthOr<T>(translated: unknown, original: T[]): T[] {
  return Array.isArray(translated) && translated.length === original.length
    ? (translated as T[])
    : original;
}

function stringOr(translated: unknown, original: string): string {
  return typeof translated === "string" && (translated.trim() || !original)
    ? translated
    : original;
}

export function buildCvTranslationPayload(
  content: CVDocumentContent,
): CvTranslatablePayload {
  return {
    candidate: {
      summary: content.candidate.summary,
      title: content.candidate.title,
    },
    certifications: content.certifications,
    education: content.education,
    experiences: content.experiences,
    interests: content.interests,
    languages: content.languages,
    projects: content.projects,
    skills: content.skills,
  };
}

export function mergeTranslatedCv(
  original: CVDocumentContent,
  raw: unknown,
  targetLanguage: Locale,
): CVDocumentContent {
  const translated = asRecord(raw);
  const candidate = asRecord(translated.candidate);
  const skills = asRecord(translated.skills);
  const originalCategories = original.skills.categories ?? [];

  return normalizeUpdatedCvContent({
    candidate: {
      ...original.candidate,
      summary: stringOr(candidate.summary, original.candidate.summary),
      title: stringOr(candidate.title, original.candidate.title),
    },
    certifications: sameLengthOr(
      translated.certifications,
      original.certifications,
    ),
    education: sameLengthOr(translated.education, original.education),
    experiences: sameLengthOr(translated.experiences, original.experiences),
    interests: stringOr(translated.interests, original.interests),
    language: targetLanguage,
    languages: sameLengthOr(translated.languages, original.languages),
    projects: sameLengthOr(translated.projects, original.projects),
    skills: {
      hard: sameLengthOr(skills.hard, original.skills.hard),
      soft: sameLengthOr(skills.soft, original.skills.soft),
      ...(original.skills.categories
        ? { categories: sameLengthOr(skills.categories, originalCategories) }
        : {}),
    },
  });
}

export function buildLetterTranslationPayload(
  content: LetterDocumentContent,
): LetterTranslatablePayload {
  return {
    body: content.body,
    candidate: { title: content.candidate.title },
    date: content.date,
    object: content.object,
  };
}

export function mergeTranslatedLetter(
  original: LetterDocumentContent,
  raw: unknown,
  targetLanguage: Locale,
): LetterDocumentContent {
  const translated = asRecord(raw);
  const body = asRecord(translated.body);
  const candidate = asRecord(translated.candidate);

  return normalizeUpdatedLetterContent({
    ...original,
    body: {
      paragraph1: stringOr(body.paragraph1, original.body.paragraph1),
      paragraph2: stringOr(body.paragraph2, original.body.paragraph2),
      paragraph3: stringOr(body.paragraph3, original.body.paragraph3),
      paragraph4: stringOr(body.paragraph4, original.body.paragraph4 ?? ""),
    },
    candidate: {
      ...original.candidate,
      title: stringOr(candidate.title, original.candidate.title),
    },
    date: stringOr(translated.date, original.date),
    language: targetLanguage,
    object: stringOr(translated.object, original.object),
  });
}

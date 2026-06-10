import type {
  CertificationItemProps,
  CVDocumentContent,
  CvContentUpdateRequest,
  CvGenerationRequest,
  EducationItemProps,
  ExperienceItemProps,
  LanguageItemProps,
  LetterContentUpdateRequest,
  LetterDocumentContent,
  LetterGenerationRequest,
  ProjectItemProps,
  SkillCategory,
} from "@cvforge/types";
import { UnprocessableEntityException } from "@nestjs/common";

const MAX_SKILL_CATEGORIES = 5;
const MAX_SKILLS_PER_CATEGORY = 6;
const FORBIDDEN_SKILL_LABEL_PREFIXES = [
  "autre",
  "autres",
  "divers",
  "diverses",
];

export type RawCvJson = {
  candidate?: Record<string, unknown>;
  certifications?: unknown[];
  education?: unknown[];
  experiences?: unknown[];
  interests?: unknown;
  languages?: unknown[];
  projects?: unknown[];
  skills?: { categories?: unknown; hard?: unknown; soft?: unknown };
};

export type RawLetterJson = {
  body?: Record<string, unknown>;
  candidate?: Record<string, unknown>;
  company?: Record<string, unknown>;
  date?: unknown;
  object?: unknown;
  signature?: Record<string, unknown>;
};

function toStr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function toStrArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toStr(item)).filter((item) => item.length > 0);
}

function uniqueStrings(values: string[], seen = new Set<string>()): string[] {
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function isForbiddenSkillLabel(label: string): boolean {
  const normalized = label.toLocaleLowerCase("fr");
  return FORBIDDEN_SKILL_LABEL_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix} `),
  );
}

function normalizeItems<T>(
  raw: unknown[],
  mapper: (value: Record<string, unknown>) => T | null,
): T[] {
  return raw
    .map((item) =>
      item && typeof item === "object"
        ? mapper(item as Record<string, unknown>)
        : null,
    )
    .filter((item): item is T => item !== null);
}

function normalizeExperiences(raw: unknown[]): ExperienceItemProps[] {
  return normalizeItems(raw, (item) => ({
    achievements: toStrArray(item.achievements),
    company: toStr(item.company),
    description: toStr(item.description),
    endDate: toStr(item.endDate),
    position: toStr(item.position),
    startDate: toStr(item.startDate),
  }));
}

function normalizeEducation(raw: unknown[]): EducationItemProps[] {
  return normalizeItems(raw, (item) => ({
    description: toStr(item.description),
    degree: toStr(item.degree),
    institution: toStr(item.institution),
    mention: toStr(item.mention),
    year: toStr(item.year),
  }));
}

function normalizeCertifications(raw: unknown[]): CertificationItemProps[] {
  return normalizeItems(raw, (item) => ({
    issuer: toStr(item.issuer),
    title: toStr(item.title),
    year: toStr(item.year),
  }));
}

function normalizeLanguages(raw: unknown[]): LanguageItemProps[] {
  return normalizeItems(raw, (item) => ({
    language: toStr(item.language),
    level: toStr(item.level),
  }));
}

function normalizeProjects(raw: unknown[]): ProjectItemProps[] {
  return normalizeItems(raw, (item) => ({
    description: toStr(item.description),
    title: toStr(item.title),
    url: toStr(item.url),
  }));
}

export function normalizeSkillCategories(
  raw: unknown,
): SkillCategory[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const seenItems = new Set<string>();
  const categories = normalizeItems(raw, (item) => {
    const label = toStr(item.label) || toStr(item.category);
    if (!label || isForbiddenSkillLabel(label)) {
      return null;
    }

    const items = uniqueStrings(toStrArray(item.items), seenItems).slice(
      0,
      MAX_SKILLS_PER_CATEGORY,
    );
    return items.length > 0 ? { label, items } : null;
  }).slice(0, MAX_SKILL_CATEGORIES);

  return categories.length > 0 ? categories : undefined;
}

function buildSkills(raw: RawCvJson["skills"]): CVDocumentContent["skills"] {
  const categories = normalizeSkillCategories(raw?.categories);
  const hard = categories
    ? categories.flatMap((category) => category.items)
    : uniqueStrings(toStrArray(raw?.hard));
  return { hard, soft: [], ...(categories ? { categories } : {}) };
}

export function extractJsonFromContent<T>(raw: string): T {
  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new UnprocessableEntityException(
      "La génération IA n'a pas retourné un JSON exploitable.",
    );
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    throw new UnprocessableEntityException(
      "La génération IA a retourné un JSON invalide.",
    );
  }
}

export function normalizeCvJson(
  raw: RawCvJson,
  localFields: CvGenerationRequest["localFields"],
  promptProfile: CvGenerationRequest["promptProfile"],
): CVDocumentContent {
  const candidate = raw.candidate ?? {};
  return {
    candidate: {
      city: toStr(candidate.city),
      email: localFields.email,
      firstName: toStr(candidate.firstName),
      github: toStr(candidate.github),
      lastName: localFields.lastName,
      linkedin: toStr(candidate.linkedin),
      phone: localFields.phone,
      summary: toStr(candidate.summary),
      title: toStr(candidate.title),
    },
    certifications: normalizeCertifications(raw.certifications ?? []),
    education: normalizeEducation(raw.education ?? []),
    experiences: normalizeExperiences(raw.experiences ?? []),
    interests:
      toStr(promptProfile.profileSections.interests) || toStr(raw.interests),
    languages: normalizeLanguages(raw.languages ?? []),
    projects: normalizeProjects(raw.projects ?? []),
    skills: buildSkills(raw.skills),
  };
}

export function normalizeUpdatedCvContent(
  value: CvContentUpdateRequest["cvContent"],
): CVDocumentContent {
  const categories = normalizeSkillCategories(value.skills?.categories);
  return {
    candidate: {
      city: toStr(value.candidate.city),
      email: toStr(value.candidate.email),
      firstName: toStr(value.candidate.firstName),
      github: toStr(value.candidate.github),
      lastName: toStr(value.candidate.lastName),
      linkedin: toStr(value.candidate.linkedin),
      phone: toStr(value.candidate.phone),
      summary: toStr(value.candidate.summary),
      title: toStr(value.candidate.title),
    },
    certifications: normalizeCertifications(value.certifications ?? []),
    education: normalizeEducation(value.education ?? []),
    experiences: normalizeExperiences(value.experiences ?? []),
    interests: toStr(value.interests),
    languages: normalizeLanguages(value.languages ?? []),
    projects: normalizeProjects(value.projects ?? []),
    skills: {
      hard: uniqueStrings(toStrArray(value.skills?.hard)),
      soft: uniqueStrings(toStrArray(value.skills?.soft)),
      ...(categories ? { categories } : {}),
    },
  };
}

export function normalizeLetterJson(
  raw: RawLetterJson,
  localFields: LetterGenerationRequest["localFields"],
  fallbackCompanyName: string | null,
  fallbackCompanyCity: string | null,
  fallbackObject: string,
): LetterDocumentContent {
  const candidate = raw.candidate ?? {};
  const signature = raw.signature ?? {};
  const paragraph4 = toStr(raw.body?.paragraph4);
  return {
    body: {
      paragraph1: toStr(raw.body?.paragraph1),
      paragraph2: toStr(raw.body?.paragraph2),
      paragraph3: toStr(raw.body?.paragraph3),
      ...(paragraph4 ? { paragraph4 } : {}),
    },
    candidate: {
      city: toStr(candidate.city),
      email: localFields.email,
      firstName: toStr(candidate.firstName),
      github: toStr(candidate.github),
      lastName: localFields.lastName,
      linkedin: toStr(candidate.linkedin),
      phone: localFields.phone,
      title: toStr(candidate.title),
    },
    company: {
      city: toStr(raw.company?.city, fallbackCompanyCity ?? ""),
      name: toStr(raw.company?.name, fallbackCompanyName ?? ""),
    },
    date: toStr(raw.date, new Date().toISOString().slice(0, 10)),
    object: toStr(raw.object, fallbackObject),
    signature: {
      firstName: toStr(signature.firstName, toStr(candidate.firstName)),
      lastName: localFields.lastName,
    },
  };
}

export function normalizeUpdatedLetterContent(
  value: LetterContentUpdateRequest["letterContent"],
): LetterDocumentContent {
  const paragraph4 = toStr(value.body.paragraph4);
  return {
    body: {
      paragraph1: toStr(value.body.paragraph1),
      paragraph2: toStr(value.body.paragraph2),
      paragraph3: toStr(value.body.paragraph3),
      ...(paragraph4 ? { paragraph4 } : {}),
    },
    candidate: {
      city: toStr(value.candidate.city),
      email: toStr(value.candidate.email),
      firstName: toStr(value.candidate.firstName),
      github: toStr(value.candidate.github),
      lastName: toStr(value.candidate.lastName),
      linkedin: toStr(value.candidate.linkedin),
      phone: toStr(value.candidate.phone),
      title: toStr(value.candidate.title),
    },
    company: {
      city: toStr(value.company.city),
      name: toStr(value.company.name),
    },
    date: toStr(value.date),
    object: toStr(value.object),
    signature: {
      firstName: toStr(value.signature.firstName),
      lastName: toStr(value.signature.lastName),
    },
  };
}

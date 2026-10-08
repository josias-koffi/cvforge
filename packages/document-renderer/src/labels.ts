import type { Locale } from "@cvforge/types";

export interface DocumentLabels {
  certifications: string;
  drivingLicense: string;
  education: string;
  experiences: string;
  interests: string;
  keySkills: string;
  languages: string;
  letterObject: string;
  profile: string;
  projects: string;
  skills: string;
}

const LABELS: Record<Locale, DocumentLabels> = {
  en: {
    certifications: "Certifications",
    drivingLicense: "Driving licence",
    education: "Education",
    experiences: "Experience",
    interests: "Interests",
    keySkills: "Key skills",
    languages: "Languages",
    letterObject: "Subject:",
    profile: "Profile",
    projects: "Projects",
    skills: "Skills",
  },
  fr: {
    certifications: "Certifications",
    drivingLicense: "Permis",
    education: "Formation",
    experiences: "Expériences",
    interests: "Centres d'intérêt",
    keySkills: "Compétences clés",
    languages: "Langues",
    letterObject: "Objet :",
    profile: "Profil",
    projects: "Projets",
    skills: "Compétences",
  },
};

/** Section labels for a document; legacy documents without a language are French. */
export function documentLabels(language: Locale | undefined): DocumentLabels {
  return LABELS[language ?? "fr"];
}

/** "Permis A, B" for the contact line; empty when the candidate has none. */
export function drivingLicenseText(
  licenses: string[] | undefined,
  language: Locale | undefined,
): string {
  return licenses?.length
    ? `${documentLabels(language).drivingLicense} ${licenses.join(", ")}`
    : "";
}

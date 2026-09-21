import type {
  InterviewContextExperience,
  InterviewContextSnapshot,
  Locale,
} from "@cvforge/types";
import type { StoredApplication } from "../applications/applications.types";

/**
 * What the interviewer is told about the job and the candidate.
 *
 * None of this used to reach it: `startSession` fetched the application only
 * to check ownership and threw the result away, so the recruiter ran a
 * generic interview with no idea what role it was interviewing for — while
 * the setup form promised the opposite. The offer did reach the *grading*
 * prompt, which is where `describeApplication` used to live.
 *
 * Everything here is paid for on every single turn, so it is budgeted rather
 * than complete: roughly 450 tokens, clipped on word boundaries.
 */
const MAX_SUMMARY = 300;
const MAX_OFFER_EXCERPT = 900;
const MAX_REQUIREMENTS = 8;
const MAX_RESPONSIBILITIES = 6;
const MAX_SKILLS = 12;
const MAX_EXPERIENCES = 3;

/** Cuts on a word boundary, so the model never reads half a word as a term. */
export function clip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;

  const cut = trimmed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  // Back off to the last space unless that would throw away more than half
  // the budget — which only happens when a single word fills it.
  const kept = lastSpace >= max / 2 ? cut.slice(0, lastSpace) : cut;

  return `${kept.trimEnd()}…`;
}

function clean(value: string | null | undefined, max: number): string | null {
  const text = value?.trim();
  return text ? clip(text, max) : null;
}

/**
 * One line per job, without the achievements.
 *
 * Vision §10.6 asks for a pseudonymised CV: the interviewer needs to know
 * where the candidate worked and for how long so it can ask about it, and
 * nothing here is the candidate's name, phone or address.
 */
export function describeExperiences(
  experiences: Array<{
    company?: string;
    endDate?: string;
    position?: string;
    startDate?: string;
  }>,
): InterviewContextExperience[] {
  return experiences.slice(0, MAX_EXPERIENCES).map((experience) => ({
    company: experience.company?.trim() ?? "",
    period: [experience.startDate, experience.endDate]
      .map((date) => date?.trim() ?? "")
      .filter(Boolean)
      .join(" – "),
    role: experience.position?.trim() ?? "",
  }));
}

/** Null when the session has no application: free practice stays generic. */
export function buildContextSnapshot(
  application: StoredApplication | null,
): InterviewContextSnapshot | null {
  if (!application) return null;

  // Every field is optional here on purpose. This feeds a prompt, not a
  // calculation: a half-extracted offer should make the interview vaguer, not
  // make it fail.
  const extracted = application.extracted;
  const cv = application.cvContent;

  return {
    candidateExperiences: describeExperiences(cv?.experiences ?? []),
    candidateHeadline: clean(cv?.candidate?.title, 120),
    candidateSkills: list(cv?.skills?.hard).slice(0, MAX_SKILLS),
    company: application.companyContext ?? null,
    companyName: clean(extracted?.companyName, 120),
    offerExcerpt: clean(application.rawOfferText, MAX_OFFER_EXCERPT),
    offerSummary: clean(extracted?.summary, MAX_SUMMARY),
    offerTitle: clean(extracted?.title, 120),
    requirements: list(extracted?.requirements).slice(0, MAX_REQUIREMENTS),
    responsibilities: list(extracted?.responsibilities).slice(
      0,
      MAX_RESPONSIBILITIES,
    ),
  };
}

/** Anything that is not an array of non-empty strings becomes an empty list. */
function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const LABELS: Record<Locale, Record<string, string>> = {
  en: {
    candidate: "Candidate",
    company: "Company",
    culture: "Company culture",
    empty: "No linked application context.",
    experience: "Recent roles",
    none: "None",
    offer: "Offer excerpt",
    requirements: "Requirements",
    responsibilities: "Responsibilities",
    salary: "Typical pay for the role",
    sector: "Sector",
    size: "Company size",
    skills: "Skills",
    summary: "Summary",
    title: "Offer title",
    values: "Stated values",
  },
  fr: {
    candidate: "Candidat",
    company: "Entreprise",
    culture: "Culture d'entreprise",
    empty: "Aucune offre liee: entretien generique.",
    experience: "Postes recents",
    none: "Aucune",
    offer: "Extrait de l'offre",
    requirements: "Exigences",
    responsibilities: "Missions",
    salary: "Remuneration usuelle du poste",
    sector: "Secteur",
    size: "Taille",
    skills: "Competences",
    summary: "Resume",
    title: "Intitule du poste",
    values: "Valeurs affichees",
  },
};

/** The snapshot as prose, for the system prompt. Shared with the report. */
export function describeContext(
  context: InterviewContextSnapshot | null,
  language: Locale,
): string {
  const label = LABELS[language === "en" ? "en" : "fr"];
  if (!context) return label.empty!;

  const lines = [
    line(label.title, context.offerTitle),
    line(label.company, context.companyName),
    line(label.summary, context.offerSummary),
    line(label.requirements, join(context.requirements, label.none!)),
    line(label.responsibilities, join(context.responsibilities, label.none!)),
    ...describeCompany(context, label),
    line(label.candidate, context.candidateHeadline),
    line(label.skills, join(context.candidateSkills, label.none!)),
    line(label.experience, joinExperiences(context.candidateExperiences)),
    line(label.offer, context.offerExcerpt),
  ];

  return lines.filter((entry): entry is string => entry !== null).join("\n");
}

function describeCompany(
  context: InterviewContextSnapshot,
  label: Record<string, string>,
) {
  const company = context.company;
  if (!company) return [];

  return [
    line(label.sector, company.sector),
    line(label.size, company.size),
    line(label.culture, company.culture),
    line(label.values, company.values.length ? company.values.join(", ") : null),
    line(label.salary, company.salaryEstimate),
  ];
}

function line(label: string | undefined, value: string | null) {
  return value ? `${label}: ${value}` : null;
}

function join(values: string[], fallback: string) {
  return values.length ? values.join(", ") : fallback;
}

function joinExperiences(experiences: InterviewContextExperience[]) {
  if (experiences.length === 0) return null;

  return experiences
    .map((experience) =>
      [experience.role, experience.company, experience.period]
        .filter(Boolean)
        .join(" — "),
    )
    .join(" | ");
}

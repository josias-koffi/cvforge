/**
 * Answers the candidate saved for the questions recruiters' forms ask
 * (ADR-034 §5): the extension fills them, never invents them. Facts the
 * profile already holds (city, current company, licences, links, languages,
 * availability) are read from the profile, not stored twice.
 */
export const SCREENING_ANSWER_KEYS = [
  "salaryExpectation",
  "workAuthorization",
  "noticePeriod",
  "relocation",
  "workArrangement",
  "referralSource",
] as const;

export type ScreeningAnswerKey = (typeof SCREENING_ANSWER_KEYS)[number];

export const SCREENING_ANSWER_LABELS: Record<
  ScreeningAnswerKey,
  { label: string; example: string }
> = {
  noticePeriod: { example: "1 mois", label: "Préavis" },
  referralSource: {
    example: "Site carrière de l'entreprise",
    label: "Comment avez-vous connu l'offre ?",
  },
  relocation: {
    example: "Oui, partout en France",
    label: "Mobilité, déménagement",
  },
  salaryExpectation: {
    example: "45 000 € brut annuel",
    label: "Prétentions salariales",
  },
  workArrangement: {
    example: "Hybride, 2 jours sur site",
    label: "Mode de travail souhaité",
  },
  workAuthorization: {
    example: "Oui, sans besoin de visa",
    label: "Autorisation de travail (visa)",
  },
};

export type CustomScreeningAnswer = {
  question: string;
  answer: string;
  updatedAt: string;
};

export type ScreeningAnswers = {
  known: Partial<Record<ScreeningAnswerKey, string>>;
  /** Questions met on a form and answered by the candidate, kept for later. */
  custom: CustomScreeningAnswer[];
  updatedAt: string | null;
};

export const SCREENING_ANSWER_MAX_LENGTH = 1_000;
export const SCREENING_QUESTION_MAX_LENGTH = 300;
export const SCREENING_CUSTOM_MAX = 100;

export function isScreeningAnswerKey(
  value: unknown,
): value is ScreeningAnswerKey {
  return (SCREENING_ANSWER_KEYS as readonly unknown[]).includes(value);
}

/** Same question asked with other spacing, case or punctuation. */
export function screeningQuestionKey(question: string): string {
  return question
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

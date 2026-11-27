/**
 * Which of the candidate's data a form field asks for, without a model
 * (US-203). Pure: the page script reads the field's attributes and label,
 * this decides. Anything unsure is left to the model, never guessed.
 */
import { sameQuestion } from "./question";

export type FieldKey =
  | "firstName"
  | "lastName"
  | "fullName"
  | "email"
  | "phone"
  | "city"
  | "linkedin"
  | "github"
  | "portfolio"
  | "currentCompany"
  | "currentTitle";

/** What the page script knows about a field. */
export type FieldHints = {
  label: string;
  name?: string;
  id?: string;
  autocomplete?: string;
  type?: string;
};

/** The candidate's data, ready for the page: no model, no guess. */
export type PrefillData = {
  values: Partial<Record<FieldKey, string>>;
  answers: { question: string; answer: string }[];
  /** Saved answers by their key (salary, notice…), for the learned map (US-205). */
  known?: Record<string, string>;
};

export const normalized = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const AUTOCOMPLETE: Record<string, FieldKey> = {
  email: "email",
  "family-name": "lastName",
  "given-name": "firstName",
  name: "fullName",
  organization: "currentCompany",
  "organization-title": "currentTitle",
  tel: "phone",
  "tel-national": "phone",
};

/**
 * Field names and ids of the main platforms, read on their real forms
 * (fixtures in `page/fixtures`): Lever, Greenhouse, Ashby, Workable.
 */
const PLATFORM_NAMES: Record<string, FieldKey> = {
  // Lever
  email: "email",
  name: "fullName",
  org: "currentCompany",
  phone: "phone",
  "urls[github]": "github",
  "urls[linkedin]": "linkedin",
  "urls[portfolio]": "portfolio",
  // Greenhouse
  first_name: "firstName",
  last_name: "lastName",
  // Ashby
  _systemfield_email: "email",
  _systemfield_name: "fullName",
  // Workable
  firstname: "firstName",
  lastname: "lastName",
};

/** A label about another person or thing: « Referrer email », « Company name ». */
const SOMEONE_ELSE =
  /\b(refer\w*|referent|parrain\w*|manager|reference\w*|company|entreprise|societe|school|ecole|emergency|urgence|recruiter|recruteur)\b/;

const LABEL_RULES: [RegExp, FieldKey][] = [
  [
    /^(nom complet|nom et prenom|prenom et nom|nom prenom|full ?name|your name|name|nom)$/,
    "fullName",
  ],
  [/\b(prenom|first ?name|given name|forename)\b/, "firstName"],
  [/\b(nom de famille|last ?name|surname|family name)\b/, "lastName"],
  [/\b(e ?mail|courriel|adresse electronique)\b/, "email"],
  [/\b(telephone|phone|mobile|portable|tel)\b/, "phone"],
  [/linkedin/, "linkedin"],
  [/github/, "github"],
  [
    /\b(portfolio|site web|site personnel|website|personal site)\b/,
    "portfolio",
  ],
  [/\b(ville|city|current location|location|localisation)\b/, "city"],
];

const CURRENT_COMPANY =
  /^(current company|entreprise actuelle|societe actuelle|employeur actuel|current employer)$/;
const CURRENT_TITLE =
  /^(current title|current role|poste actuel|intitule du poste actuel)$/;

/** Drops « (required) », « * » and the like around a label. */
export const labelWords = (label: string) =>
  normalized(label)
    .replace(/\b(required|obligatoire|optional|optionnel|facultatif)\b/g, "")
    .trim()
    .replace(/\s+/g, " ");

/** Which data a label alone asks for; only short labels count. */
export function classifyLabel(label: string): FieldKey | null {
  const words = labelWords(label);
  if (!words || words.split(" ").length > 6) return null;
  if (CURRENT_COMPANY.test(words)) return "currentCompany";
  if (CURRENT_TITLE.test(words)) return "currentTitle";
  if (SOMEONE_ELSE.test(words)) return null;
  return LABEL_RULES.find(([pattern]) => pattern.test(words))?.[1] ?? null;
}

/** Which data a field asks for: autocomplete, then platform names, then label. */
export function classifyField(field: FieldHints): FieldKey | null {
  const autocomplete = field.autocomplete?.toLowerCase().trim() ?? "";
  if (AUTOCOMPLETE[autocomplete]) return AUTOCOMPLETE[autocomplete];
  for (const key of [field.name, field.id]) {
    const known = key ? PLATFORM_NAMES[key.toLowerCase()] : undefined;
    if (known) return known;
  }
  const fromLabel = classifyLabel(field.label);
  if (fromLabel) return fromLabel;
  if (field.type === "email") return "email";
  if (field.type === "tel") return "phone";
  return null;
}

/** A saved answer to this question, even phrased differently. */
export function savedAnswer(
  label: string,
  answers: PrefillData["answers"],
): string | null {
  if (!label.trim()) return null;
  return (
    answers.find((entry) =>
      sameQuestion(entry.question, label, { strict: true }),
    )?.answer ?? null
  );
}

const YES = new Set(["oui", "yes", "true"]);
const NO = new Set(["non", "no", "false"]);

/**
 * The option that says exactly the saved answer (« Oui » for « Yes »).
 * Anything less than an exact match is left to the model.
 */
export function matchOption(answer: string, options: string[]): number | null {
  const wanted = normalized(answer);
  const same = (option: string) => {
    const text = normalized(option);
    if (text === wanted) return true;
    if (YES.has(wanted)) return YES.has(text);
    if (NO.has(wanted)) return NO.has(text);
    return false;
  };
  const found = options.map((option, index) => [option, index] as const);
  const matches = found.filter(([option]) => same(option));
  return matches.length === 1 ? matches[0]![1] : null;
}

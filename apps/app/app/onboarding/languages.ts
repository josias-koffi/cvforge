import type { LanguageEntry } from "../profile/base-profile-types";

// Onboarding asks for languages as one free-text line ("Francais C2, Anglais B2"),
// while the profile stores them as { language, level }. These are the level
// spellings candidates actually type, used to find where the name stops.
const LEVEL_PATTERN = new RegExp(
  [
    "[ABC][12]", // CEFR
    "langue\\s+maternelle",
    "maternelle",
    "bilingue",
    "courant(?:e)?",
    "interm[ée]diaire",
    "d[ée]butant(?:e)?",
    "scolaire",
    "professionnel(?:le)?",
    "natif|native",
    "fluent",
    "notions?",
    "lu,?\\s*[ée]crit",
  ].join("|"),
  "i",
);

const EXPLICIT_SEPARATOR = /\s*[:(–—-]\s*/;

/** Splits one entry into a language and the level that follows it, if any. */
function parseEntry(raw: string): LanguageEntry | null {
  const entry = raw.trim().replace(/\)$/, "");
  if (!entry) return null;

  // "Anglais - C1", "Anglais : courant", "Anglais (courant)"
  const separated = entry.split(EXPLICIT_SEPARATOR);
  if (separated.length > 1 && separated[0].trim()) {
    return {
      language: separated[0].trim(),
      level: separated.slice(1).join(" ").trim(),
    };
  }

  // "Anglais C1", "Français langue maternelle"
  const match = LEVEL_PATTERN.exec(entry);
  if (match && match.index > 0) {
    return {
      language: entry.slice(0, match.index).trim(),
      level: entry.slice(match.index).trim(),
    };
  }

  return { language: entry, level: "" };
}

/**
 * Turns the onboarding free-text field into profile entries.
 *
 * The split is a best effort on what people type; the candidate can fix any
 * entry in the profile editor afterwards. Nothing is invented: when no level is
 * recognised the level stays empty rather than being guessed.
 */
export function parseOnboardingLanguages(value: string): LanguageEntry[] {
  return value
    .split(/[,;\n]/)
    .map(parseEntry)
    .filter((entry): entry is LanguageEntry => entry !== null);
}

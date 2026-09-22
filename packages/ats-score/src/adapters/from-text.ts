import { SECTION_HEADINGS } from "../lexicons";
import { countWords, normalizeToken } from "../normalize";
import type {
  AtsContactPresence,
  AtsDocument,
  AtsExperience,
  AtsFileSignals,
  AtsSectionPresence,
} from "../types";

/** A heading is a short line; a sentence that merely mentions "formation" is not one. */
const MAX_HEADING_WORDS = 5;

const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
/** Ten or more digits, tolerating the spaces, dots and dashes people write. */
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\d[\s.-]?){9,}\d/;
const LINKEDIN = /linkedin\.com|linked-?in\b/i;
const PORTFOLIO = /github\.com|gitlab\.com|behance\.net|dribbble\.com|\bportfolio\b/i;
const BULLET_LINE = /^\s*[-–—•*·]\s+/;

/**
 * Date ranges as a CV writes them, which is how an experience is recognised
 * without any structure to rely on.
 */
const DATE_RANGE =
  /((?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}|(?:19|20)\d{2}(?:-(?:0?[1-9]|1[0-2]))?)\s*(?:[-–—]|à|to|au)\s*((?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}|(?:19|20)\d{2}(?:-(?:0?[1-9]|1[0-2]))?|présent|present|aujourd'hui|current|now|en cours)/i;

/**
 * The landing path: a CV as extracted from a PDF or DOCX, with no structure
 * beyond line breaks.
 *
 * Everything here is inference, and it is deliberately conservative — a missed
 * section costs the candidate points, so a heading must look like a heading
 * rather than merely contain the word.
 */
export function parseCvText(text: string, file?: AtsFileSignals): AtsDocument {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const experiences = extractExperiences(lines);
  const blocks = sectionBlocks(lines);

  return {
    bulletCount: lines.filter((line) => BULLET_LINE.test(line)).length,
    contact: detectContact(text),
    educationCount: countEntries(blocks.get("education")),
    experiences,
    ...(file ? { file } : {}),
    rawText: text,
    sections: detectSections(lines),
    skills: extractSkills(blocks.get("skills")),
    wordCount: countWords(text),
  };
}

/**
 * Groups the lines under the heading they follow, so a section's content can be
 * read without a second pass over the whole document.
 */
function sectionBlocks(lines: string[]) {
  const blocks = new Map<string, string[]>();
  let current: string[] | null = null;

  for (const line of lines) {
    const section = isHeadingLike(line) ? sectionOf(headingKey(line)) : null;

    if (section) {
      current = [];
      blocks.set(section, current);
      continue;
    }

    current?.push(line);
  }

  return blocks;
}

function sectionOf(key: string) {
  return (
    Object.entries(SECTION_HEADINGS).find(([, candidates]) =>
      (candidates as readonly string[]).includes(key),
    )?.[0] ?? null
  );
}

/** Skills are written as separated lists far more often than as sentences. */
function extractSkills(block: string[] | undefined) {
  if (!block) return [];

  return [
    ...new Set(
      block
        .flatMap((line) => line.replace(BULLET_LINE, "").split(/[,;•·|/]/))
        .map((skill) => skill.trim())
        // A whole sentence is prose about the skills, not a skill.
        .filter((skill) => skill.length > 1 && countWords(skill) <= 4),
    ),
  ];
}

/** A dated line is a diploma; the rest is its description. */
function countEntries(block: string[] | undefined) {
  return block?.filter((line) => /(19|20)\d{2}/.test(line)).length ?? 0;
}

function detectContact(text: string): AtsContactPresence {
  return {
    city: hasCity(text),
    email: EMAIL.test(text),
    linkedIn: LINKEDIN.test(text),
    phone: PHONE.test(text),
    portfolio: PORTFOLIO.test(text),
  };
}

/**
 * The city is the one contact detail with no shape of its own — no "@", no run
 * of digits, no domain. Rather than guess against a list of place names, we
 * read the header line that already carries the email or the phone and look
 * for a short, digit-free segment beside them, which is where a CV puts it.
 *
 * A French postal code is accepted outright, since nothing else looks like one
 * on such a line.
 */
function hasCity(text: string) {
  return text
    .split(/\r?\n/)
    .filter((line) => EMAIL.test(line) || PHONE.test(line))
    .flatMap((line) => line.split(/[|•·,]/))
    .some(isCityLike);
}

function isCityLike(segment: string) {
  const value = segment.trim();

  if (value.length < 3 || EMAIL.test(value) || /https?:|\.\w{2,}\//.test(value)) {
    return false;
  }

  if (/\b\d{5}\b/.test(value)) return true;

  const words = countWords(value);

  return words >= 1 && words <= 3 && !/\d/.test(value);
}

function detectSections(lines: string[]): AtsSectionPresence {
  const headings = lines.filter(isHeadingLike).map(headingKey);

  const has = (candidates: readonly string[]) =>
    headings.some((heading) => candidates.includes(heading));

  return {
    certifications: has(SECTION_HEADINGS.certifications),
    education: has(SECTION_HEADINGS.education),
    experience: has(SECTION_HEADINGS.experience),
    languages: has(SECTION_HEADINGS.languages),
    skills: has(SECTION_HEADINGS.skills),
    summary: has(SECTION_HEADINGS.summary),
  };
}

function isHeadingLike(line: string) {
  return countWords(line) <= MAX_HEADING_WORDS && !BULLET_LINE.test(line);
}

/** Collapses punctuation and accents so "EXPÉRIENCE :" and "experience" are one key. */
function headingKey(line: string) {
  return normalizeToken(line).replace(/\s+/g, " ").trim();
}

/**
 * An experience is a line carrying a date range, and the bulleted lines that
 * follow it until the next dated line.
 *
 * Role and company are left empty: guessing which half of "Développeur —
 * Acme" is which produces confident nonsense, and no rule depends on telling
 * them apart.
 */
function extractExperiences(lines: string[]): AtsExperience[] {
  const experiences: AtsExperience[] = [];

  for (const line of lines) {
    const match = DATE_RANGE.exec(line);

    if (match) {
      experiences.push({
        bullets: [],
        company: "",
        endDate: match[2] ?? "",
        role: line.replace(DATE_RANGE, "").trim(),
        startDate: match[1] ?? "",
      });

      continue;
    }

    const current = experiences.at(-1);

    if (current && BULLET_LINE.test(line)) {
      current.bullets.push(line.replace(BULLET_LINE, "").trim());
    }
  }

  return experiences;
}

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
 * Month names, French and English, abbreviated or not.
 *
 * "Oct. 2024" is the shape our own generator is instructed to produce, and the
 * shape most CVs use. Reading only "10/2024" meant the experiences of a CV we
 * had written ourselves were invisible, while its diplomas — dated in bare
 * years — were read as jobs.
 */
const MONTH =
  "(?:janv|f[ée]vr?|mars|avr|mai|juin|juil|ao[uû]t|sept?|oct|nov|d[ée]c|jan|feb|mar|apr|may|jun|jul|aug|dec)[a-zà-ÿ]*\\.?";
const YEAR = `(?:${MONTH}\\s+)?(?:19|20)\\d{2}`;
const DATE = `(?:(?:0?[1-9]|1[0-2])[/-](?:19|20)\\d{2}|${YEAR}(?:-(?:0?[1-9]|1[0-2]))?)`;
const PRESENT = "présent|present|aujourd'hui|current|now|en cours";

/**
 * Date ranges as a CV writes them, which is how an experience is recognised
 * without any structure to rely on.
 */
const DATE_RANGE = new RegExp(
  `(${DATE})\\s*(?:[-–—]|à|to|au)\\s*(${DATE}|${PRESENT})`,
  "i",
);

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
    evidenceText: withoutBlock(lines, blocks.get("skills")),
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
      headingMatches(key, candidates as readonly string[]),
    )?.[0] ?? null
  );
}

/**
 * The document minus the lines of one section — used to keep the skills list
 * out of the prose a claimed skill is checked against, so the list cannot
 * vouch for itself.
 */
function withoutBlock(lines: string[], block: string[] | undefined) {
  if (!block || block.length === 0) return lines.join("\n");

  const excluded = new Set(block);

  return lines.filter((line) => !excluded.has(line)).join("\n");
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
    headings.some((heading) => headingMatches(heading, candidates));

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
  if (BULLET_LINE.test(line)) return false;
  // A letter-spaced heading blows one word out into a dozen, so the word count
  // is measured on the squeezed form or "EX P É R I E N C E S" never gets to
  // be a heading at all.
  if (isLetterSpaced(headingKey(line))) return true;

  return countWords(line) <= MAX_HEADING_WORDS;
}

/** Collapses punctuation and accents so "EXPÉRIENCE :" and "experience" are one key. */
function headingKey(line: string) {
  return normalizeToken(line).replace(/\s+/g, " ").trim();
}

/**
 * True when a heading arrived with its letters blown apart.
 *
 * A CSS `letter-spacing` on a section title makes the PDF text layer report
 * "EX P É R I E N C E S": the glyphs sit far enough apart that the extractor
 * reads the gaps as spaces. Our own template did exactly this, and the engine
 * then found no experience section in the very CV we sell as ATS-ready — so
 * third-party CVs styled the same way were being failed for a defect that is
 * one of typography, not of content.
 *
 * Requiring most of the words to be single letters is what keeps "CV de Léa
 * Moreau" out of it.
 */
function isLetterSpaced(key: string) {
  const words = key.split(" ").filter(Boolean);

  return (
    words.length >= 3 &&
    words.filter((word) => word.length === 1).length >= words.length / 2
  );
}

/**
 * Compares a heading to a known one, ignoring spacing when the line looks
 * letter-spaced. Word boundaries are lost in that case ("CO M P É T E N C E S
 * C L É S"), so both sides are compared with every space removed.
 */
function headingMatches(key: string, candidates: readonly string[]) {
  if (candidates.includes(key)) return true;
  if (!isLetterSpaced(key)) return false;

  const squeezed = key.replace(/ /g, "");

  return candidates.some(
    (candidate) => candidate.replace(/ /g, "") === squeezed,
  );
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
  let open = false;
  // `null` until the first heading: a CV that uses none at all must still have
  // its dated lines read as jobs.
  let section: string | null = null;

  for (const line of lines) {
    if (isHeadingLike(line)) {
      const heading = sectionOf(headingKey(line));

      if (heading) {
        section = heading;
        open = false;
        continue;
      }
    }

    // Only the experience section holds jobs. Without this, three diplomas —
    // dated in bare years, right under "FORMATION" — were read as three jobs,
    // and the career then looked out of chronological order.
    if (section !== null && section !== "experience") continue;

    const match = DATE_RANGE.exec(line);

    if (match) {
      experiences.push({
        bullets: [],
        company: "",
        endDate: match[2] ?? "",
        role: line.replace(DATE_RANGE, "").trim(),
        startDate: match[1] ?? "",
      });
      open = true;

      continue;
    }

    const current = experiences.at(-1);

    if (!open || !current) continue;

    if (BULLET_LINE.test(line)) {
      current.bullets.push(line.replace(BULLET_LINE, "").trim());
      continue;
    }

    if (isAchievementLine(line)) {
      current.bullets.push(line.trim());
    }
  }

  return experiences;
}

/** An achievement is at least this long; shorter lines are company names. */
const MIN_ACHIEVEMENT_WORDS = 4;

/**
 * A line of an experience that carries content, bullet character or not.
 *
 * Requiring the marker meant a CV whose bullets did not survive PDF extraction
 * was read as having no achievements at all — and then told its bullets opened
 * on no action verb, when the truth is we never found them. Real CVs lose their
 * markers routinely: a CSS `list-style` bullet is drawn into the page but never
 * written into its text layer, which is exactly what our own template did.
 */
function isAchievementLine(line: string) {
  return countWords(line) >= MIN_ACHIEVEMENT_WORDS;
}

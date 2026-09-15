export type PseudonymizedCv = { firstName: string; text: string };

const CANDIDATE_TOKEN = "[CANDIDATE]";
// The name sits in the first lines; big OCR'd headings there are the most often misread.
const HEADER_LINE_COUNT = 8;
// Handle parts shorter than this are initials ("jd.dupont"); name parts go down to "Ly" or "Ng".
const MIN_HANDLE_TOKEN_LENGTH = 3;
const MIN_NAME_PART_LENGTH = 2;
const MIN_FUZZY_NAME_LENGTH = 4;
// OCR often drops the first or last letters of a large heading ("ARTINE" for "MARTINEAU").
const MIN_TRUNCATED_NAME_RATIO = 0.6;
const MAX_NAME_WORDS = 4;
// Name particles are common words ("le", "de"): masking them everywhere would destroy the CV text.
const NAME_PARTICLES = new Set(["da", "de", "del", "der", "des", "di", "du", "la", "le", "les", "van", "von"]);
// E-mail / LinkedIn handle parts that are not names and must not be masked across the CV.
const GENERIC_HANDLE_TOKENS = new Set([
  "candidature", "contact", "email", "hello", "info", "job", "jobs", "mail", "perso", "pro", "recrutement", "resume", "work",
]);

const EMAIL_PATTERN = /([A-Z0-9._%+-]+)@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LINKEDIN_SLUG_PATTERN = /linkedin\.com\/in\/([A-Za-z0-9-]+)/gi;
const WORD_PATTERN = /[\p{L}][\p{L}'’-]*/gu;
const NAME_WORD_PATTERN = /^\p{Lu}[\p{L}'’-]+$/u;

function normalizeWord(word: string) {
  return word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function isAllCaps(word: string) {
  return word === word.toUpperCase() && word !== word.toLowerCase();
}

/** True when `a` and `b` differ by at most one insertion, deletion or substitution. */
function withinOneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }

  return edits + (a.length - i) + (b.length - j) <= 1;
}

function isOcrVariant(part: string, name: string) {
  if (name.length < MIN_FUZZY_NAME_LENGTH || part.length < MIN_FUZZY_NAME_LENGTH - 1) return false;

  return (
    withinOneEdit(part, name) ||
    (name.includes(part) && part.length >= Math.ceil(name.length * MIN_TRUNCATED_NAME_RATIO))
  );
}

function matchesName(word: string, names: Set<string>, fuzzy: boolean) {
  return nameParts(word).some((part) =>
    [...names].some((name) => part === name || (fuzzy && isOcrVariant(part, name))),
  );
}

/** Splits "Gall-Morvan" or "d'Arc" into maskable parts, without particles. */
function nameParts(word: string) {
  return normalizeWord(word)
    .split(/['’-]/)
    .filter((part) => part.length >= MIN_NAME_PART_LENGTH && !NAME_PARTICLES.has(part));
}

/**
 * Name parts found in e-mail local parts and LinkedIn slugs, which survive a garbled OCR heading.
 * `leading` holds the first part of multi-part handles ("camille" in camille.martineau), the only
 * position where a handle may carry the first name rather than the last name.
 */
function extractHandleTokens(rawText: string) {
  const handles = [
    ...[...rawText.matchAll(EMAIL_PATTERN)].map((match) => match[1]),
    ...[...rawText.matchAll(LINKEDIN_SLUG_PATTERN)].map((match) => match[1]),
  ];
  const all = new Set<string>();
  const leading = new Set<string>();

  for (const handle of handles) {
    const tokens = normalizeWord(handle)
      .split(/[^a-z]+/)
      .filter((token) => token.length >= MIN_HANDLE_TOKEN_LENGTH && !GENERIC_HANDLE_TOKENS.has(token));
    tokens.forEach((token) => all.add(token));
    if (tokens.length > 1) leading.add(tokens[0]);
  }

  return { all, leading };
}

/**
 * Finds the "First LAST" line among the header lines. When handles are known, only a line sharing a
 * name with them is trusted, so a job title such as "Senior Product Engineer" is not mistaken for a name.
 */
function detectHeaderName(headerLines: string[], handleTokens: Set<string>) {
  for (const line of headerLines) {
    const cleaned = line.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    const words = cleaned.split(/\s+/);

    if (/[@\d]/.test(cleaned) || words.length < 2 || words.length > MAX_NAME_WORDS) continue;
    if (!words.every((word) => NAME_WORD_PATTERN.test(word))) continue;
    if (handleTokens.size > 0 && !words.some((word) => matchesName(word, handleTokens, true))) continue;

    // French CVs write the last name in capitals ("Jean DUPONT", "DUPONT Jean").
    const capitalised = words.filter(isAllCaps);
    if (capitalised.length > 0 && capitalised.length < words.length) {
      return { firstName: words.find((word) => !isAllCaps(word))!, lastNames: capitalised };
    }

    return { firstName: words[0], lastNames: words.slice(1) };
  }

  return undefined;
}

function maskNames(text: string, names: Set<string>) {
  if (names.size === 0) return text;

  let headerLinesLeft = HEADER_LINE_COUNT;
  return text
    .split("\n")
    .map((line) => {
      const inHeader = headerLinesLeft > 0;
      if (line.trim()) headerLinesLeft--;

      return line.replace(WORD_PATTERN, (word) => (matchesName(word, names, inHeader) ? CANDIDATE_TOKEN : word));
    })
    .join("\n");
}

/**
 * Removes direct identifiers from CV text before any AI call (vision §15.3). The last name is taken from
 * the header and from e-mail / LinkedIn handles, then masked accent-insensitively, tolerating one OCR
 * error per word in the header. Unsure handle parts are masked too: over-masking is the safe failure.
 */
export function pseudonymizeCvText(rawText: string): PseudonymizedCv {
  const headerLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, HEADER_LINE_COUNT);
  const handleTokens = extractHandleTokens(rawText);
  const headerName = detectHeaderName(headerLines, handleTokens.all);
  const headerFirstName = normalizeWord(headerName?.firstName ?? "");

  const names = new Set([
    ...(headerName?.lastNames ?? []).flatMap(nameParts),
    // A handle part is spared only when it is the leading part and matches the header first name.
    ...[...handleTokens.all].filter(
      (token) => !(handleTokens.leading.has(token) && headerFirstName && withinOneEdit(token, headerFirstName)),
    ),
  ]);
  // Never hint the AI with a "first name" that is actually one of the masked names.
  const firstName = headerName && !matchesName(headerName.firstName, names, false) ? headerName.firstName : "";

  const text = rawText
    .replace(EMAIL_PATTERN, "[EMAIL_OMITTED]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[PHONE_OMITTED]")
    .replace(/\b(?:date de naissance|birth date|born)\s*[:-]?\s*[^\n\r]+/gi, "[BIRTH_DATE_OMITTED]")
    .replace(/\b(?:adresse|address)\s*[:-]?\s*[^\n\r]+/gi, "[ADDRESS_OMITTED]");

  return { firstName, text: maskNames(text, names) };
}

import type { SearchContractType } from "@cvforge/types";
import { fold } from "../shared/text";

/**
 * What a company's own job board never says plainly: which contract this is,
 * and whether the job is in France.
 *
 * France Travail answers both with reference codes. An applicant tracking
 * system answers with free text written by the recruiter — "Stagiaire
 * Marketing (H/F)", "Software Engineer Intern", "CDI - Paris". These two
 * functions are the whole difference between a usable board offer and noise.
 */

const CONTRACT_PATTERNS: Array<[SearchContractType, RegExp]> = [
  [
    "alternance",
    /\b(alternance|alternant|alternante|apprenti|apprentie|apprentissage|contrat pro|professionnalisation|apprenticeship|work[- ]?study)\b/,
  ],
  [
    "stage",
    /\b(stage|stagiaire|internship|intern|trainee|praktikum|summer analyst)\b/,
  ],
  ["vie", /\b(vie|vive|volontariat international)\b/],
  ["interim", /\b(interim|int[eé]rimaire|temp agency|temporary staffing)\b/],
  [
    "freelance",
    /\b(freelance|free[- ]lance|ind[eé]pendant|ind[eé]pendante|contractor|portage|consultant ind[eé]pendant)\b/,
  ],
  [
    "cdd",
    /\b(cdd|fixed[- ]term|dur[eé]e d[eé]termin[eé]e|temporary contract|contrat temporaire|befristet)\b/,
  ],
  [
    "cdi",
    /\b(cdi|permanent|unlimited contract|dur[eé]e ind[eé]termin[eé]e|ind[eé]termin[eé]e|full[- ]time permanent|unbefristet)\b/,
  ],
];

/**
 * Reads the contract from whatever the board gave us — the title, the
 * employment type field, the first lines of the description.
 *
 * Returns "unknown" rather than guessing. A wrong guess sends a permanent
 * contract to somebody who only wants an internship, which is the one mistake
 * this feature cannot make; the scorer treats "unknown" accordingly.
 */
export function classifyContract(input: {
  title?: string;
  employmentType?: string;
  description?: string;
}): SearchContractType | "unknown" {
  // The title and the employment type carry the intent; the description is
  // last because it often *mentions* other contracts ("nos alternants…").
  const ordered = [input.title, input.employmentType, input.description];

  for (const field of ordered) {
    const haystack = fold(field ?? "");
    if (!haystack) continue;

    for (const [contract, pattern] of CONTRACT_PATTERNS) {
      if (pattern.test(haystack)) return contract;
    }
  }

  return "unknown";
}

export interface NormalizedLocation {
  label: string;
  /** INSEE department code when the text names a French city we know. */
  department: string;
  inFrance: boolean;
  remote: boolean;
}

const REMOTE_PATTERNS =
  /\b(remote|t[eé]l[eé]travail|telework|work from home|full[- ]remote|anywhere|distanciel)\b/;

const FRANCE_PATTERNS = /\b(france|french|fr)\b/;

/**
 * The main French cities, with their department. A board writes "Paris",
 * "Lyon, France" or "Nantes (44)" — never an INSEE code — and the department
 * is what the daily collection groups candidates by.
 *
 * Deliberately short: a city missing here still reads as being in France when
 * the text says so, it simply scores no distance bonus.
 */
const CITY_DEPARTMENTS: Record<string, string> = {
  aixenprovence: "13",
  amiens: "80",
  angers: "49",
  annecy: "74",
  bordeaux: "33",
  brest: "29",
  caen: "14",
  clermontferrand: "63",
  dijon: "21",
  grenoble: "38",
  lehavre: "76",
  lille: "59",
  limoges: "87",
  lyon: "69",
  marseille: "13",
  metz: "57",
  montpellier: "34",
  mulhouse: "68",
  nancy: "54",
  nantes: "44",
  nice: "06",
  nimes: "30",
  orleans: "45",
  paris: "75",
  perpignan: "66",
  reims: "51",
  rennes: "35",
  roubaix: "59",
  rouen: "76",
  saintetienne: "42",
  strasbourg: "67",
  toulon: "83",
  toulouse: "31",
  tours: "37",
  villeurbanne: "69",
};

/**
 * Whether an offer is worth keeping, and where it is.
 *
 * A company board lists its offers worldwide: "Berlin, Berlin, Germany" sits
 * next to "Paris, France". Only France — or a fully remote job — is kept.
 */
export function normalizeLocation(
  rawLocation: string,
  extra: { countryHint?: string; remoteHint?: boolean } = {},
): NormalizedLocation {
  const label = rawLocation.trim();
  const folded = fold(label);
  const country = fold(extra.countryHint ?? "");
  const remote = Boolean(extra.remoteHint) || REMOTE_PATTERNS.test(folded);

  const department = departmentFor(folded);
  const inFrance =
    department !== "" ||
    FRANCE_PATTERNS.test(country) ||
    country === "fr" ||
    FRANCE_PATTERNS.test(folded);

  return { department, inFrance, label, remote };
}

/**
 * The department a French postcode belongs to: two digits, except overseas
 * (97x, 98x) where it is three.
 */
export function departmentFromPostcode(postalCode: string | undefined): string {
  const code = postalCode?.trim() ?? "";
  if (!/^\d{5}$/.test(code)) return "";

  return /^9[789]/.test(code) ? code.slice(0, 3) : code.slice(0, 2);
}

/** A French city named anywhere in the text, or an explicit "(44)". */
function departmentFor(folded: string): string {
  const explicit = /\((\d{2}[ab]?|\d{3})\)/.exec(folded);
  if (explicit?.[1]) return explicit[1].toUpperCase();

  const compact = folded.replace(/[^a-z0-9]/g, "");

  for (const [city, department] of Object.entries(CITY_DEPARTMENTS)) {
    if (compact.includes(city)) return department;
  }

  return "";
}

/**
 * Turns a board's HTML description into plain text.
 *
 * Entities are decoded **before** the tags are stripped, and again after:
 * Greenhouse serves its content double-escaped (`&lt;p&gt;`), so stripping
 * first would leave the whole advert as visible markup.
 */
export function htmlToText(html: string): string {
  const stripped = decodeEntities(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities(stripped)
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&");
}

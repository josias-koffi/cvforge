import { fold } from "../../shared/text";
import type { JobSource } from "../job-search.types";

/**
 * The keys two adverts are compared on.
 *
 * The same job is published by France Travail *and* by the company's own
 * board, often with a different title ("Développeur Full Stack (H/F)" against
 * "Full-Stack Developer F/H") and a different link. Showing it twice makes the
 * morning selection look careless; merging two genuinely different jobs is
 * worse, because one of them disappears. Everything here errs towards not
 * merging.
 */

const TRACKING_PARAMS = /^(utm_|fbclid|gclid|mc_|ref$|ref_|source$|from$)/i;

/**
 * A link, stripped of everything that does not identify the offer: scheme,
 * `www.`, tracking parameters, trailing slash, letter case of the host.
 *
 * Two adverts with the same key are the same offer — this is the only
 * certainty in the whole file.
 */
export function urlKey(rawUrl: string): string {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return "";

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return "";
  }

  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "");
  const query = url.searchParams.toString();

  return `${host}${path}${query ? `?${query}` : ""}`.toLowerCase();
}

const LEGAL_FORMS = new Set([
  "sa",
  "sarl",
  "sas",
  "sasu",
  "sc",
  "scop",
  "sci",
  "selarl",
  "snc",
  "eurl",
  "gmbh",
  "ltd",
  "limited",
  "inc",
  "llc",
  "bv",
  "nv",
  "ag",
  "plc",
  "corp",
  "corporation",
  "group",
  "groupe",
  "holding",
  "france",
  "paris",
  "international",
]);

/**
 * "ACME SAS", "Acme Group France" and "acme" all fold to "acme".
 *
 * The legal form and the country are dropped because recruiters write them
 * inconsistently across boards — but only when something else remains, or
 * "Groupe SAS" would fold to nothing and match every other empty name.
 */
export function companyKey(companyName: string): string {
  const words = fold(companyName)
    .split(" ")
    .filter(Boolean);
  const kept = words.filter((word) => !LEGAL_FORMS.has(word));

  return (kept.length > 0 ? kept : words).join(" ");
}

/** Gender markers, seniority noise and punctuation, all of it removed. */
const TITLE_NOISE = new Set([
  "h",
  "f",
  "x",
  "m",
  "w",
  "d",
  "hf",
  "fh",
  "homme",
  "femme",
  "cdi",
  "cdd",
  "stage",
  "alternance",
  "poste",
  "job",
  "offre",
  "recrutement",
  "we",
  "are",
  "hiring",
  "the",
  "le",
  "la",
  "les",
  "un",
  "une",
  "de",
  "du",
  "des",
  "en",
  "et",
  "a",
  "au",
  "aux",
  "pour",
  "chez",
]);

/**
 * A title reduced to its meaningful words, sorted.
 *
 * Sorting is what makes "Développeur Full Stack" and "Full Stack Developer…"
 * comparable once the words match; it also means word order alone can never
 * separate two adverts for the same job.
 */
export function titleKey(title: string): string {
  return [...new Set(tokenizeTitle(title))].sort().join(" ");
}

export function tokenizeTitle(title: string): string[] {
  return fold(title)
    .split(" ")
    .map((word) => singular(word))
    .filter((word) => word.length > 1 && !TITLE_NOISE.has(word));
}

/** Crude on purpose: French plurals are an "s" often enough. */
function singular(word: string): string {
  return word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word;
}

/**
 * How alike two titles are, from 0 to 1, on their character trigrams.
 *
 * Trigrams rather than words: they survive a typo, a hyphen and an accent, all
 * of which differ between the same offer's two publications.
 */
export function trigramSimilarity(left: string, right: string): number {
  const a = trigrams(left);
  const b = trigrams(right);
  if (a.size === 0 || b.size === 0) return 0;

  let shared = 0;
  for (const trigram of a) {
    if (b.has(trigram)) shared += 1;
  }

  return shared / (a.size + b.size - shared);
}

function trigrams(value: string): Set<string> {
  const padded = `  ${fold(value)} `;
  const found = new Set<string>();

  for (let index = 0; index + 3 <= padded.length; index += 1) {
    found.add(padded.slice(index, index + 3));
  }

  return found;
}

/**
 * A 64-bit fingerprint of a text, as hexadecimal.
 *
 * Two descriptions that differ by a paragraph still land within a few bits of
 * each other — which is what lets the same advert be recognised when one board
 * adds a legal footer the other does not.
 */
export function simhash(text: string): string {
  const vector = new Array<number>(64).fill(0);
  const tokens = fold(text).split(" ").filter(Boolean);

  for (const token of tokens) {
    const hash = hash64(token);

    for (let bit = 0; bit < 64; bit += 1) {
      const isSet = (hash >> BigInt(bit)) & 1n;
      vector[bit] += isSet === 1n ? 1 : -1;
    }
  }

  let fingerprint = 0n;
  for (let bit = 0; bit < 64; bit += 1) {
    if ((vector[bit] ?? 0) > 0) fingerprint |= 1n << BigInt(bit);
  }

  return fingerprint.toString(16).padStart(16, "0");
}

/** FNV-1a, widened to 64 bits. Fast, and good enough to spread tokens. */
function hash64(token: string): bigint {
  let hash = 0xcbf29ce484222325n;

  for (let index = 0; index < token.length; index += 1) {
    hash ^= BigInt(token.charCodeAt(index));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }

  return hash;
}

/** How many bits differ between two fingerprints; 64 when either is missing. */
export function hammingDistance(left: string, right: string): number {
  if (!left || !right) return 64;

  let difference = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let bits = 0;

  while (difference > 0n) {
    bits += Number(difference & 1n);
    difference >>= 1n;
  }

  return bits;
}

/**
 * Which source's wording is kept when several publish the same offer.
 *
 * The company's own board wins: its text is the recruiter's own, complete, and
 * it links straight to the application form. France Travail comes next;
 * Adzuna last, because it truncates descriptions.
 */
const SOURCE_PRIORITY: Record<JobSource, number> = {
  adzuna: 10,
  ashby: 100,
  france_travail: 50,
  greenhouse: 100,
  la_bonne_alternance: 40,
  lever: 100,
  personio: 100,
  recruitee: 100,
  smartrecruiters: 100,
  welcomekit: 100,
  workable: 100,
};

export function sourcePriority(source: JobSource): number {
  return SOURCE_PRIORITY[source] ?? 0;
}

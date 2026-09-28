import type { Locale } from "@cvforge/types";

const TAG_PATTERN = /<[^>]+>/g;
const MULTISPACE_PATTERN = /\s+/g;
const HTML_ENTITY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/&nbsp;/gi, " "],
  [/&amp;/gi, "&"],
  [/&quot;/gi, '"'],
  [/&#39;/gi, "'"],
  [/&lt;/gi, "<"],
  [/&gt;/gi, ">"],
];

function decodeHtmlEntities(value: string) {
  return HTML_ENTITY_REPLACEMENTS.reduce(
    (output, [pattern, replacement]) => output.replace(pattern, replacement),
    value,
  );
}

function readMetaContent(html: string, attrName: string, attrValue: string) {
  const pattern = new RegExp(
    `<meta[^>]+${attrName}=["']${attrValue}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );

  return decodeHtmlEntities(html.match(pattern)?.[1]?.trim() ?? "");
}

function readTitle(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";

  return decodeHtmlEntities(title.replace(MULTISPACE_PATTERN, " ").trim());
}

export function extractVisibleTextFromHtml(html: string) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  return decodeHtmlEntities(withoutScripts.replace(TAG_PATTERN, " "))
    .replace(MULTISPACE_PATTERN, " ")
    .trim();
}

export function buildOfferPreview(offerText: string, limit = 220) {
  return offerText.length <= limit
    ? offerText
    : `${offerText.slice(0, limit - 1).trimEnd()}...`;
}

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * "experience" is spelled identically in both languages, so it never
 * discriminates anything — deliberately left out of both signal lists below.
 */
export function inferLocaleFromText(text: string): Locale {
  const lowered = stripDiacritics(text.toLowerCase());
  const frenchSignals = [
    "bonjour",
    "poste",
    "profil",
    "entreprise",
    "responsabilites",
    "candidat",
    "offre",
    "mission",
    "competences",
    "nous recherchons",
    "societe",
  ];
  const englishSignals = [
    "responsibilities",
    "requirements",
    "company",
    "candidate",
    "role",
    "about us",
    "skills",
    "we are looking",
    "duties",
    "you will",
  ];

  const frenchScore = frenchSignals.filter((signal) =>
    lowered.includes(signal),
  ).length;
  const englishScore = englishSignals.filter((signal) =>
    lowered.includes(signal),
  ).length;

  if (englishScore > frenchScore) return "en";
  if (frenchScore > englishScore) return "fr";

  // True tie, including 0-0 (no signal matched either way): default to
  // French, the primary user base, rather than silently biasing every
  // ambiguous case the same way the ">=" it replaces used to.
  return "fr";
}

export function extractOfferMetadata(html: string) {
  const title =
    readMetaContent(html, "property", "og:title") ||
    readMetaContent(html, "name", "twitter:title") ||
    readTitle(html);
  const description =
    readMetaContent(html, "name", "description") ||
    readMetaContent(html, "property", "og:description");
  const siteName = readMetaContent(html, "property", "og:site_name");

  return {
    description: description || null,
    siteName: siteName || null,
    title: title || null,
  };
}

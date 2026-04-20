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

export function inferLocaleFromText(text: string): Locale {
  const lowered = text.toLowerCase();
  const frenchSignals = [
    "bonjour",
    "poste",
    "profil",
    "entreprise",
    "responsabilites",
    "candidat",
    "experience",
    "offre",
  ];
  const englishSignals = [
    "responsibilities",
    "requirements",
    "company",
    "candidate",
    "experience",
    "role",
    "about us",
  ];

  const frenchScore = frenchSignals.filter((signal) =>
    lowered.includes(signal),
  ).length;
  const englishScore = englishSignals.filter((signal) =>
    lowered.includes(signal),
  ).length;

  return frenchScore >= englishScore ? "fr" : "en";
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

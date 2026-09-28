import type { ContactLink } from "@cvforge/types";

/**
 * CVs and letters saved before the free-form links list stored `linkedin` and
 * `github` as scalars on the candidate. Read as-is, a missing `links` crashed
 * every screen and export that lists it; the old values are ported in instead.
 */
const LEGACY_LINK_FIELDS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "github", label: "GitHub" },
] as const;

export function withContactLinks<T extends { candidate: { links: ContactLink[] } }>(
  content: T,
): T;
export function withContactLinks<T extends { candidate: { links: ContactLink[] } }>(
  content: T | null,
): T | null;
export function withContactLinks<T extends { candidate: { links: ContactLink[] } }>(
  content: T | null,
): T | null {
  if (!content?.candidate || Array.isArray(content.candidate.links)) return content;

  const { linkedin, github, ...candidate } = content.candidate as T["candidate"] &
    Record<string, unknown>;
  const legacy: Record<string, unknown> = { github, linkedin };
  const links = LEGACY_LINK_FIELDS.flatMap(({ key, label }) => {
    const url = legacy[key];

    return typeof url === "string" && url.trim() ? [{ label, url: url.trim() }] : [];
  });

  return { ...content, candidate: { ...candidate, links } };
}

import { createHash } from "node:crypto";

/**
 * Where a company logo may come from (ADR-025), and nowhere else: the logo
 * proxy fetches whatever URL a page asks for, so this list is what keeps it
 * from being an open proxy into the network.
 */
const ALLOWED_PREFIXES = [
  // France Travail's offers API, `entreprise.logo`: public, no token needed.
  "https://api.francetravail.fr/exp-rechercheoffre/v1/logo-entreprise/",
  // Wikimedia Commons thumbnails, built by `commonsThumbnailUrl` below.
  "https://upload.wikimedia.org/wikipedia/commons/thumb/",
];

export function isAllowedLogoUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  // Normalised first: "https://api.francetravail.fr/../" must not pass.
  return ALLOWED_PREFIXES.some((prefix) => url.href.startsWith(prefix));
}

/**
 * Commons only serves thumbnails in standard widths: 128 answers 400, 120
 * answers a 2 to 7 KB PNG (checked on 2026-09-24).
 */
const THUMBNAIL_WIDTH = 120;

/**
 * The PNG thumbnail of a Commons file, from its name as Wikidata's logo
 * statement (P154) gives it: "Logo OVH.svg".
 *
 * A thumbnail rather than the file: logos are mostly SVG there, and an SVG is
 * a document that can carry script — a rendered PNG cannot. The path is
 * Commons' own: the MD5 of the name, spaces written as underscores.
 */
export function commonsThumbnailUrl(fileName: string): string | null {
  const name = fileName.trim().replace(/ /g, "_");
  if (!name || name.includes("/")) return null;

  const hash = createHash("md5").update(name).digest("hex");
  const encoded = encodeURIComponent(name);
  const png = name.toLowerCase().endsWith(".svg") ? ".png" : "";

  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash[0]}/${hash.slice(0, 2)}/${encoded}/${THUMBNAIL_WIDTH}px-${encoded}${png}`;
}

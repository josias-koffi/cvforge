import { detectAtsBoard, type BoardProvider, type DetectedBoard } from "./detect-board";

/**
 * Finding the companies whose job board we can read, from the Common Crawl
 * index.
 *
 * Common Crawl is a public archive of the web, free to query. Asking it for
 * every URL under `boards.greenhouse.io/*` returns the companies the web links
 * to — which is how the registry gets thousands of entries without anybody
 * maintaining a list, and without scraping a search engine (ADR-023).
 *
 * **Lever is absent on purpose**: it forbids Common Crawl's robot in its
 * `robots.txt`, so there is nothing to find there. Its companies arrive
 * through France Travail partner links and candidates' imports instead.
 */

export const CRAWL_INDEX_URL = "https://index.commoncrawl.org";

/** The URL patterns to ask the index for, per provider. */
export const CRAWL_PATTERNS: Partial<Record<BoardProvider, string[]>> = {
  ashby: ["jobs.ashbyhq.com/*"],
  greenhouse: ["boards.greenhouse.io/*", "job-boards.greenhouse.io/*"],
  personio: ["*.jobs.personio.de/*"],
  recruitee: ["*.recruitee.com/*"],
  smartrecruiters: ["careers.smartrecruiters.com/*"],
  workable: ["apply.workable.com/*"],
};

/**
 * Reads the index's answer: one JSON object per line, each with the URL that
 * was crawled. Malformed lines are skipped — the index is a 9 GB stream of
 * third-party data, and one bad line must not lose the rest of the page.
 */
export function readCrawlBoards(body: string): DetectedBoard[] {
  const seen = new Set<string>();
  const boards: DetectedBoard[] = [];

  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;

    let url: unknown;
    try {
      url = (JSON.parse(trimmed) as { url?: unknown }).url;
    } catch {
      continue;
    }

    if (typeof url !== "string") continue;

    const board = detectAtsBoard(url);
    if (!board) continue;

    const key = `${board.provider}:${board.boardToken}`;
    if (seen.has(key)) continue;

    seen.add(key);
    boards.push(board);
  }

  return boards;
}

/**
 * Tokens the index returns that are not companies: shared paths of the
 * providers themselves. Registering them would mean a daily call that can only
 * ever 404.
 */
const RESERVED_TOKENS = new Set([
  "api",
  "assets",
  "auth",
  "cdn",
  "embed",
  "images",
  "jobs",
  "login",
  "privacy",
  "robots.txt",
  "static",
  "terms",
  "www",
]);

export function isPlausibleBoardToken(boardToken: string): boolean {
  const token = boardToken.toLowerCase();

  return (
    token.length >= 2 &&
    token.length <= 60 &&
    !RESERVED_TOKENS.has(token) &&
    /^[a-z0-9][a-z0-9._-]*$/i.test(token)
  );
}

/** The index query for one pattern, newest crawl first. */
export function crawlQueryUrl(collection: string, pattern: string): string {
  const url = new URL(`${CRAWL_INDEX_URL}/${collection}-index`);
  url.searchParams.set("url", pattern);
  url.searchParams.set("output", "json");
  url.searchParams.set("fl", "url");

  return url.toString();
}

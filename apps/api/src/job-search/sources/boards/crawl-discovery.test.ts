import { describe, expect, it } from "vitest";
import {
  CRAWL_PATTERNS,
  crawlQueryUrl,
  isPlausibleBoardToken,
  readCrawlBoards,
} from "./crawl-discovery";

describe("readCrawlBoards", () => {
  it("reads the companies out of the index stream", () => {
    const body = [
      '{"urlkey":"io,greenhouse,boards)/doctolib/jobs/1","url":"https://boards.greenhouse.io/doctolib/jobs/1","status":"200"}',
      '{"url":"https://boards.greenhouse.io/doctolib/jobs/2","status":"200"}',
      '{"url":"https://jobs.ashbyhq.com/ledger/4354","status":"200"}',
    ].join("\n");

    // The same company twice costs one registry entry, not two.
    expect(readCrawlBoards(body)).toEqual([
      { boardToken: "doctolib", provider: "greenhouse" },
      { boardToken: "ledger", provider: "ashby" },
    ]);
  });

  it("skips a malformed line instead of losing the page", () => {
    const body = [
      "pas du json",
      '{"url": "cassé',
      '{"url":"https://boards.greenhouse.io/acme/jobs/1"}',
      '{"nourl":true}',
      "",
    ].join("\n");

    expect(readCrawlBoards(body)).toEqual([
      { boardToken: "acme", provider: "greenhouse" },
    ]);
  });

  it("ignores a crawled URL that names no company", () => {
    const body = '{"url":"https://boards.greenhouse.io/"}';

    expect(readCrawlBoards(body)).toEqual([]);
  });
});

describe("isPlausibleBoardToken", () => {
  it.each(["doctolib", "ledger", "acme-corp", "a1"])("accepts %s", (token) => {
    expect(isPlausibleBoardToken(token)).toBe(true);
  });

  it.each(["embed", "static", "robots.txt", "a", "", "avec espace"])(
    "refuses %j",
    (token) => {
      expect(isPlausibleBoardToken(token)).toBe(false);
    },
  );
});

describe("CRAWL_PATTERNS", () => {
  it("leaves Lever out: its robots.txt forbids the crawler", () => {
    expect(CRAWL_PATTERNS.lever).toBeUndefined();
    expect(CRAWL_PATTERNS.greenhouse).toContain("job-boards.greenhouse.io/*");
  });
});

describe("crawlQueryUrl", () => {
  it("builds the index query", () => {
    const url = new URL(crawlQueryUrl("CC-MAIN-2026-33", "jobs.ashbyhq.com/*"));

    expect(url.pathname).toBe("/CC-MAIN-2026-33-index");
    expect(url.searchParams.get("url")).toBe("jobs.ashbyhq.com/*");
    expect(url.searchParams.get("output")).toBe("json");
  });
});

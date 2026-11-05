import type { JobBoardsStore } from "../../boards.types";
import {
  BoardNotFoundError,
  BoardRefusedError,
  type CompanyBoardAdapter,
} from "./board.types";
import {
  CRAWL_INDEX_URL,
  CRAWL_PATTERNS,
  crawlQueryUrl,
  isPlausibleBoardToken,
  readCrawlBoards,
} from "./crawl-discovery";
import type { BoardProvider, DetectedBoard } from "./detect-board";

/** Collections tried when the index cannot list its own. Newest first. */
const FALLBACK_COLLECTIONS = ["CC-MAIN-2026-43", "CC-MAIN-2026-39", "CC-MAIN-2026-34"];
/** How many of the newest crawls are tried, one after the other, for a pattern. */
const COLLECTIONS_TRIED = 4;
/** Pages read per pattern: the index serves a few thousand URLs per page. */
const MAX_PAGES_PER_PATTERN = 25;
/** Companies verified on their provider per run; the rest wait for tomorrow. */
export const DEFAULT_VERIFY_BUDGET = 600;
/** Waits between the attempts at one index request (a 504 is the common case). */
const RETRY_DELAYS_MS = [2_000, 10_000, 30_000];

const USER_AGENT = "CVForgeJobBot/1.0 (+https://cvforge.fr/robot; contact@cvforge.fr)";

export interface PatternReport {
  pattern: string;
  /** The crawl that answered, or null when none did. */
  collection: string | null;
  pagesRead: number;
  candidates: number;
}

export interface DiscoveryReport {
  patterns: PatternReport[];
  /** Plausible companies the index named, new or not. */
  candidates: number;
  alreadyKnown: number;
  registered: number;
  /** Verified and found with no offer in France or remote: recorded, disabled. */
  empty: number;
  /** The provider has no such board: recorded, disabled. */
  gone: number;
  /** Could not be verified (timeout, 429, 5xx): left for the next run. */
  unverified: number;
  /** Left for the next run by the daily budget. */
  deferred: number;
  /** Index requests that failed even after their retries. */
  indexFailures: number;
}

export interface DiscoveryOptions {
  provider?: BoardProvider;
  /** A given crawl only; otherwise the newest ones are tried in turn. */
  collection?: string;
  verifyBudget?: number;
}

export interface DiscoveryDeps {
  store: Pick<JobBoardsStore, "find" | "register" | "setEnabled">;
  verifiers: Partial<Record<BoardProvider, CompanyBoardAdapter>>;
  fetchImpl?: typeof globalThis.fetch;
  sleep?: (delayMs: number) => Promise<void>;
  /** Shuffles the candidates; injected so tests are deterministic. */
  random?: () => number;
  log?: (line: string) => void;
}

/**
 * Finds the companies whose job board we can read, from the Common Crawl
 * index, and registers the ones that publish in France.
 *
 * The index is a free public service that often answers 504: every request is
 * retried with a growing pause, and a pattern the newest crawl cannot answer
 * is asked of the previous ones. Verification is the safeguard that makes this
 * safe to run unattended — a company is registered only after its provider's
 * own API showed an offer in France or remote work. The ones that failed that
 * test are recorded as disabled so they are not verified again every day; a
 * failure that says nothing about the company (timeout, 429) records nothing.
 */
export class CrawlRunner {
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly sleep: (delayMs: number) => Promise<void>;
  private readonly random: () => number;
  private readonly log: (line: string) => void;
  private indexFailures = 0;

  constructor(private readonly deps: DiscoveryDeps) {
    this.fetchImpl = deps.fetchImpl ?? globalThis.fetch;
    this.sleep = deps.sleep ?? ((delayMs) => new Promise((done) => setTimeout(done, delayMs)));
    this.random = deps.random ?? Math.random;
    this.log = deps.log ?? (() => {});
  }

  async run(options: DiscoveryOptions = {}): Promise<DiscoveryReport> {
    this.indexFailures = 0;
    const collections = options.collection
      ? [options.collection]
      : await this.collections();
    const report: DiscoveryReport = {
      alreadyKnown: 0,
      candidates: 0,
      deferred: 0,
      empty: 0,
      gone: 0,
      indexFailures: 0,
      patterns: [],
      registered: 0,
      unverified: 0,
    };
    const found = new Map<string, DetectedBoard>();

    for (const [provider, patterns] of Object.entries(CRAWL_PATTERNS)) {
      if (options.provider && provider !== options.provider) continue;

      for (const pattern of patterns ?? []) {
        const read = await this.readPattern(collections, pattern);
        report.patterns.push(read.report);

        for (const board of read.boards) {
          found.set(`${board.provider}:${board.boardToken}`, board);
        }
      }
    }

    report.candidates = found.size;
    await this.verify(this.shuffled([...found.values()]), report, options);
    report.indexFailures = this.indexFailures;

    return report;
  }

  private async verify(
    candidates: DetectedBoard[],
    report: DiscoveryReport,
    options: DiscoveryOptions,
  ): Promise<void> {
    let budget = options.verifyBudget ?? DEFAULT_VERIFY_BUDGET;
    const refused = new Set<BoardProvider>();

    for (const candidate of candidates) {
      if (await this.deps.store.find(candidate.provider, candidate.boardToken)) {
        report.alreadyKnown += 1;
        continue;
      }

      const verifier = this.deps.verifiers[candidate.provider];
      // Without an adapter we cannot check the company exists, and an
      // unverified guess would cost a daily 404 forever.
      if (!verifier || refused.has(candidate.provider)) {
        report.unverified += 1;
        continue;
      }
      if (budget <= 0) {
        report.deferred += 1;
        continue;
      }
      budget -= 1;

      try {
        const listings = await verifier.fetchBoard(candidate.boardToken);
        await this.deps.store.register({ ...candidate, origin: "crawl" });

        if (listings.length > 0) {
          report.registered += 1;
          this.log(`  + ${candidate.provider}/${candidate.boardToken} (${listings.length} offre(s))`);
        } else {
          // Nothing in France or remote today: kept out of the daily pass.
          await this.deps.store.setEnabled(candidate.provider, candidate.boardToken, false);
          report.empty += 1;
        }
      } catch (error) {
        if (error instanceof BoardNotFoundError) {
          await this.deps.store.register({ ...candidate, origin: "crawl" });
          await this.deps.store.setEnabled(candidate.provider, candidate.boardToken, false);
          report.gone += 1;
          continue;
        }
        // The provider asks us to slow down: stop asking it for this run.
        if (error instanceof BoardRefusedError) refused.add(candidate.provider);
        report.unverified += 1;
      }
    }
  }

  /** The newest crawls, newest first; the fallback list when the index will not say. */
  private async collections(): Promise<string[]> {
    try {
      const body = await this.request(`${CRAWL_INDEX_URL}/collinfo.json`);
      const ids = (JSON.parse(body) as Array<{ id?: unknown }>)
        .map((entry) => entry.id)
        .filter((id): id is string => typeof id === "string");
      if (ids.length > 0) return ids.slice(0, COLLECTIONS_TRIED);
    } catch {
      // Falls through to the shipped list.
    }

    return FALLBACK_COLLECTIONS;
  }

  private async readPattern(
    collections: readonly string[],
    pattern: string,
  ): Promise<{ boards: DetectedBoard[]; report: PatternReport }> {
    for (const collection of collections) {
      const pages = await this.pageCount(collection, pattern);
      if (pages === null) continue;

      const boards: DetectedBoard[] = [];
      let pagesRead = 0;

      for (let page = 0; page < Math.min(pages, MAX_PAGES_PER_PATTERN); page += 1) {
        try {
          const body = await this.request(crawlQueryUrl(collection, pattern, { page }));
          boards.push(...readCrawlBoards(body));
          pagesRead += 1;
        } catch {
          this.indexFailures += 1;
          // What was read is kept; the missing pages come back with the next run.
          break;
        }
      }

      // A crawl that announced pages but served none is as good as absent.
      if (pagesRead === 0) continue;

      const plausible = boards.filter((board) => isPlausibleBoardToken(board.boardToken));
      this.log(`${pattern}: ${plausible.length} candidate(s) from ${collection}`);

      return {
        boards: plausible,
        report: { candidates: plausible.length, collection, pagesRead, pattern },
      };
    }

    this.log(`${pattern}: no crawl answered`);

    return {
      boards: [],
      report: { candidates: 0, collection: null, pagesRead: 0, pattern },
    };
  }

  private async pageCount(collection: string, pattern: string): Promise<number | null> {
    try {
      const body = await this.request(crawlQueryUrl(collection, pattern, { pageCount: true }));
      const pages = Number((JSON.parse(body) as { pages?: unknown }).pages);

      return Number.isFinite(pages) && pages > 0 ? pages : null;
    } catch {
      this.indexFailures += 1;

      return null;
    }
  }

  /** One GET, retried after 2 s, 10 s and 30 s; throws when it never answers. */
  private async request(url: string): Promise<string> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const response = await this.fetchImpl(url, {
          headers: { "user-agent": USER_AGENT },
          signal: AbortSignal.timeout(60_000),
        });

        // A 404 means the collection has no such index: retrying cannot help.
        if (response.status === 404) throw new Error(`index answered 404 for ${url}`);
        if (response.ok) return await response.text();

        lastError = new Error(`index answered ${response.status} for ${url}`);
      } catch (error) {
        lastError = error;
        if (String(error).includes("answered 404")) break;
      }

      const delay = RETRY_DELAYS_MS[attempt];
      if (delay !== undefined) await this.sleep(delay);
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private shuffled<T>(items: T[]): T[] {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const other = Math.floor(this.random() * (index + 1));
      [copy[index], copy[other]] = [copy[other]!, copy[index]!];
    }

    return copy;
  }
}

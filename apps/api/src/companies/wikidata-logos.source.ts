import { Logger } from "@nestjs/common";
import { commonsThumbnailUrl } from "../company-logos/logo-sources";

type FetchLike = typeof globalThis.fetch;

export const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";
const TIMEOUT_MS = 15_000;
/** Wikimedia asks for a User-Agent that says who calls. */
const USER_AGENT = "CVSpark/1.0 (https://cvspark.fr)";
/** SIRENs are nine digits: anything else never reaches the search. */
const SIREN = /^\d{9}$/;
/**
 * A search is at most 300 characters: "haswbstatement:" and fifteen
 * "P1616=123456789|" fit. `wbgetentities` takes fifty items at once.
 */
const SIRENS_PER_SEARCH = 15;
const ITEMS_PER_READ = 50;

interface SearchResponse {
  query?: { search?: Array<{ title?: string }> };
}

interface Statement {
  mainsnak?: { datavalue?: { value?: unknown } };
}

interface EntitiesResponse {
  entities?: Record<string, { claims?: Record<string, Statement[]> }>;
}

/**
 * Company logos from Wikidata (ADR-025): the item carrying the company's
 * SIREN (P1616), and its logo (P154), a file on Wikimedia Commons. Only large
 * companies are there — 17 logos for 287 SIRENs on 2026-09-24 — and each file
 * is free to reuse.
 *
 * Through the wiki's own API, not the SPARQL endpoint: that one throttles
 * hard and timed out for minutes on 2026-09-24, while the API answered in a
 * second.
 */
export class WikidataLogosSource {
  private readonly logger = new Logger(WikidataLogosSource.name);

  constructor(private readonly fetchImpl: FetchLike = globalThis.fetch) {}

  /**
   * SIREN to logo thumbnail, for the companies that have one; `undefined`
   * when Wikidata failed, so the logos already known are kept.
   */
  async find(
    sirens: readonly string[],
  ): Promise<Map<string, string> | undefined> {
    const valid = [...new Set(sirens)].filter((siren) => SIREN.test(siren));
    const items = new Set<string>();

    for (const batch of chunks(valid, SIRENS_PER_SEARCH)) {
      const found = await this.get<SearchResponse>({
        action: "query",
        list: "search",
        srlimit: String(SIRENS_PER_SEARCH * 2),
        srsearch: `haswbstatement:${batch.map((siren) => `P1616=${siren}`).join("|")}`,
      });
      if (!found) return undefined;

      for (const hit of found.query?.search ?? []) {
        if (hit.title && /^Q\d+$/.test(hit.title)) items.add(hit.title);
      }
    }

    const logos = new Map<string, string>();
    const wanted = new Set(valid);

    for (const batch of chunks([...items], ITEMS_PER_READ)) {
      const read = await this.get<EntitiesResponse>({
        action: "wbgetentities",
        ids: batch.join("|"),
        props: "claims",
      });
      if (!read) return undefined;

      for (const [siren, logo] of readLogos(read)) {
        if (wanted.has(siren) && !logos.has(siren)) logos.set(siren, logo);
      }
    }

    return logos;
  }

  private async get<T>(params: Record<string, string>): Promise<T | undefined> {
    const url = `${WIKIDATA_API_URL}?${new URLSearchParams({ ...params, format: "json" })}`;

    try {
      const response = await this.fetchImpl(url, {
        headers: { accept: "application/json", "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(`Wikidata answered ${response.status}.`);
        return undefined;
      }

      return (await response.json()) as T;
    } catch (error) {
      this.logger.warn(`Wikidata failed: ${String(error)}`);
      return undefined;
    }
  }
}

/**
 * SIREN to logo thumbnail, from items read with their statements. An item
 * with several logos keeps the first: Wikidata ranks none of them for us.
 */
export function readLogos(response: EntitiesResponse): Map<string, string> {
  const logos = new Map<string, string>();

  for (const entity of Object.values(response.entities ?? {})) {
    const logo = firstString(entity.claims?.P154);
    const url = logo ? commonsThumbnailUrl(logo) : null;
    if (!url) continue;

    for (const statement of entity.claims?.P1616 ?? []) {
      const siren = statement.mainsnak?.datavalue?.value;
      if (typeof siren === "string" && !logos.has(siren)) logos.set(siren, url);
    }
  }

  return logos;
}

function firstString(statements: Statement[] | undefined): string | null {
  const value = statements?.[0]?.mainsnak?.datavalue?.value;
  return typeof value === "string" ? value : null;
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

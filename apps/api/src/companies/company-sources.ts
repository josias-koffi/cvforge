import { Logger } from "@nestjs/common";
import {
  readRetryAfterMs,
  SourceRateLimiter,
} from "../shared/rate-limit/source-rate-limiter";
import {
  readCompanyRecord,
  readEgaproScore,
  type AnnuaireResult,
  type CompanyRecord,
  type EgaproEntry,
} from "./company-record";

type FetchLike = typeof globalThis.fetch;

export const ANNUAIRE_API_URL = "https://recherche-entreprises.api.gouv.fr";
export const EGAPRO_API_URL = "https://egapro.travail.gouv.fr/api";

/**
 * The Annuaire documents 7 calls a second, but answered 429 at 5 a second on
 * 2026-09-24. Two a second reads the hundred companies of a pass, Egapro
 * included, in under two minutes.
 */
const REQUESTS_PER_SECOND = 2;
const TIMEOUT_MS = 10_000;
const DEFAULT_PAUSE_MS = 2_000;

/**
 * The public sources of a company's record (US-121): the Annuaire des
 * entreprises, and Egapro for the equality index. Both free and keyless.
 *
 * Each read answers the record, `null` when the SIREN is unknown, or
 * `undefined` when the source failed: the old record is then kept.
 */
export class CompanySources {
  private readonly logger = new Logger(CompanySources.name);
  private readonly limiter: SourceRateLimiter;

  constructor(
    private readonly fetchImpl: FetchLike = globalThis.fetch,
    private readonly now: () => number = Date.now,
    limiter?: SourceRateLimiter,
  ) {
    this.limiter =
      limiter ?? new SourceRateLimiter({ requestsPerSecond: REQUESTS_PER_SECOND });
  }

  async read(siren: string): Promise<CompanyRecord | null | undefined> {
    const results = await this.search(siren, 1);
    if (results === undefined) return undefined;

    const record = readCompanyRecord(siren, results);
    if (!record?.egaproDeclared) return record;

    const score = await this.egaproScore(siren);

    return {
      ...record,
      egaproScore: score?.score ?? null,
      egaproYear: score?.year ?? null,
    };
  }

  /**
   * The Annuaire's full-text search: a name or a SIREN, at least three
   * characters. Each result already carries the whole record.
   */
  async search(
    query: string,
    limit: number,
  ): Promise<AnnuaireResult[] | undefined> {
    const answer = await this.getJson<{ results?: AnnuaireResult[] }>(
      `${ANNUAIRE_API_URL}/search?q=${encodeURIComponent(query)}&page=1&per_page=${limit}`,
    );

    return answer === undefined ? undefined : (answer.results ?? []);
  }

  /** An Egapro failure costs the score only, not the whole record. */
  async egaproScore(siren: string) {
    const egapro = await this.getJson<{ data?: EgaproEntry[] }>(
      `${EGAPRO_API_URL}/search?q=${encodeURIComponent(siren)}`,
    );

    return readEgaproScore(siren, egapro?.data);
  }

  private async getJson<T>(url: string): Promise<T | undefined> {
    try {
      const response = await this.limiter.run(() =>
        this.fetchImpl(url, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }),
      );

      if (response.status === 429) {
        this.limiter.pauseUntil(
          this.now() +
            readRetryAfterMs(
              response.headers.get("retry-after"),
              DEFAULT_PAUSE_MS,
              this.now(),
            ),
        );
      }
      if (!response.ok) {
        this.logger.warn(`${new URL(url).host} answered ${response.status}.`);
        return undefined;
      }

      return (await response.json()) as T;
    } catch (error) {
      this.logger.warn(`${new URL(url).host} failed: ${String(error)}`);
      return undefined;
    }
  }
}

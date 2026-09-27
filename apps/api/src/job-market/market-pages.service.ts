import {
  departmentLabel,
  isFrenchDepartment,
  MARKET_MIN_SALARY_SAMPLE,
  type MarketPageEntry,
  type MarketPageLink,
  type PublicMarketPage,
  type RomeAppellationOption,
} from "@cvforge/types";
import { NotFoundException } from "@nestjs/common";
import {
  isIndexable,
  type MarketStatsStore,
  type StoredMarketStats,
} from "../market/market-stats.pg-store";
import type { RomeAppellationsReader } from "../rome/rome-appellations.pg-reader";
import { normalizeForSearch } from "../rome/rome-referential";

/** 20 000 pairs is 40 000 URLs in two languages: under a sitemap's 50 000. */
export const MAX_INDEXED_PAGES = 20_000;
const MAX_LINKS = 6;
const MAX_APPELLATIONS = 8;
const ROME_CODE = /^[A-N]\d{4}$/;

/**
 * The job × department pages of the landing (US-138): only pairs the radar
 * holds enough figures for, read from its copy. No page without data.
 */
export class MarketPagesService {
  constructor(
    private readonly store: Pick<
      MarketStatsStore,
      "find" | "listByRegions" | "listIndexable" | "listIndexableInDepartment"
    >,
    private readonly appellations: Pick<RomeAppellationsReader, "listByMetier">,
  ) {}

  async list(): Promise<MarketPageEntry[]> {
    const rows = await this.store.listIndexable(MAX_INDEXED_PAGES);

    return rows.map((row) => ({
      ...toLink(row),
      refreshedAt: row.refreshedAt.toISOString(),
    }));
  }

  async page(rawRome: string, rawDepartment: string): Promise<PublicMarketPage> {
    const romeCode = rawRome.trim().toUpperCase();
    const department = rawDepartment.trim().toUpperCase();
    const stored =
      ROME_CODE.test(romeCode) && isFrenchDepartment(department)
        ? await this.store.find(romeCode, department)
        : null;

    if (!stored || !isIndexable(stored)) {
      throw new NotFoundException("No page for this job in this department.");
    }

    const [appellations, region, inDepartment] = await Promise.all([
      this.appellations.listByMetier(romeCode, MAX_APPELLATIONS),
      this.store.listByRegions([romeCode], [stored.region]),
      this.store.listIndexableInDepartment(department, MAX_LINKS + 1),
    ]);
    const romeLabel =
      stored.romeLabel || appellations[0]?.metierLibelle || romeCode;

    return {
      ...toLink({ ...stored, romeLabel }),
      appellations,
      leadAppellationCode: leadAppellation(appellations, romeLabel)?.code ?? null,
      neighbours: region
        .filter((row) => row.department !== department && isIndexable(row))
        .sort(byOffers)
        .slice(0, MAX_LINKS)
        .map(toLink),
      otherJobs: inDepartment
        .filter((row) => row.romeCode !== romeCode)
        .slice(0, MAX_LINKS)
        .map(toLink),
      refreshedAt: stored.refreshedAt.toISOString(),
      salaryMinSample: MARKET_MIN_SALARY_SAMPLE,
      stats: {
        jobseekers: stored.jobseekers,
        offers: stored.offers,
        offersYear: stored.offersYear,
        salary: stored.salary,
        tension: stored.tension,
      },
    };
  }
}

function toLink(row: StoredMarketStats): MarketPageLink {
  return {
    department: row.department,
    departmentLabel: departmentLabel(row.department),
    romeCode: row.romeCode,
    romeLabel: row.romeLabel || row.romeCode,
  };
}

function byOffers(left: StoredMarketStats, right: StoredMarketStats) {
  return (right.offersYear?.value ?? 0) - (left.offersYear?.value ?? 0);
}

/**
 * The appellation named like the job itself, else the shortest: the job's
 * figures are the métier's, so the e-mail should follow the métier's name.
 */
export function leadAppellation(
  appellations: readonly RomeAppellationOption[],
  romeLabel: string,
): RomeAppellationOption | null {
  const label = normalizeForSearch(romeLabel);

  return (
    appellations.find(
      (appellation) => normalizeForSearch(appellation.libelle) === label,
    ) ??
    appellations[0] ??
    null
  );
}

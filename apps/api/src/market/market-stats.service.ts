import {
  departmentLabel,
  regionNeighbours,
  regionOf,
  type MarketDepartmentStats,
  type MarketRadarEntry,
  type SearchProject,
} from "@cvforge/types";
import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import type { SearchProjectsStore } from "../search-projects/search-projects.types";
import type { MarketStatsClient } from "./market-stats.client";
import {
  marketKey,
  type MarketStatsStore,
  type StoredMarketStats,
} from "./market-stats.pg-store";
import { medianSalary, notableChange } from "./market-stats.readings";

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
/** The API publishes quarterly, the tension yearly: a month is plenty. */
const REFRESH_EVERY_MS = 30 * DAY_MS;
const CHECK_INTERVAL_MS = HOUR_MS;
/**
 * Three calls a read at one call a second: forty reads is a couple of minutes
 * an hour, and a first fill for many candidates spreads over the day.
 */
const MAX_READS_PER_CHECK = 40;
/** Offers the salary median reads: a quarter, like the API's own counts. */
const SALARY_WINDOW_DAYS = 92;
/** A search with many places still gets a readable block, not a table. */
const MAX_RADAR_ENTRIES = 6;
/** A visitor's question keeps its pair in the refresh this long (US-137). */
const DEMAND_WINDOW_DAYS = 90;

/**
 * A pair to read. `own`: a candidate searches there, so it comes first and
 * its changes feed the morning e-mail. `demanded`: a visitor of the free tool
 * asked for it. Both read the job seekers too; a neighbour does not.
 */
type Target = {
  romeCode: string;
  department: string;
  own: boolean;
  demanded: boolean;
};

type Pair = { romeCode: string; department: string };

export type MarketRefreshOutcome =
  | { status: "skipped"; reason: "unavailable" | "running" }
  | { status: "done"; read: number; failed: number; due: number };

/** What the morning e-mail asks of the radar: notes for one search. */
export interface MarketNotesReader {
  notesFor(input: {
    romeCodes: readonly string[];
    project: Pick<SearchProject, "locations">;
    since: Date;
  }): Promise<string[]>;
}

/**
 * The labour market radar (US-128): tension, offers and job seekers of each
 * confirmed ROME job, in each department of the search and in the others of
 * its region, read once a month. Pages and e-mails only ever read the copy.
 */
export class MarketStatsService
  implements OnModuleInit, OnModuleDestroy, MarketNotesReader
{
  private readonly logger = new Logger(MarketStatsService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly store: MarketStatsStore,
    private readonly client: MarketStatsClient,
    private readonly searchProjects: Pick<
      SearchProjectsStore,
      "listAll" | "findByProfileId" | "findRomeCodes"
    >,
    private readonly now: () => number = Date.now,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.refreshDue().catch((error: unknown) => {
        this.logger.error(`Market refresh failed: ${String(error)}`);
      });
    }, CHECK_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Reads what is missing or a month old, the candidates' own departments
   * first. Two instances may both read a pair: the second write only repeats
   * the first.
   */
  async refreshDue(
    limit = MAX_READS_PER_CHECK,
  ): Promise<MarketRefreshOutcome> {
    if (!this.client.isAvailable()) {
      return { reason: "unavailable", status: "skipped" };
    }
    if (this.running) return { reason: "running", status: "skipped" };

    this.running = true;
    try {
      const targets = wantedTargets(
        await this.searchProjects.listAll(),
        await this.store.listDemand(
          new Date(this.now() - DEMAND_WINDOW_DAYS * DAY_MS),
        ),
      );
      const refreshed = await this.store.refreshedAt([
        ...new Set(targets.map((target) => target.romeCode)),
      ]);
      const due = targets
        .filter((target) => {
          const at = refreshed.get(marketKey(target.romeCode, target.department));
          return !at || this.now() - at.getTime() >= REFRESH_EVERY_MS;
        })
        .sort(
          (left, right) =>
            Number(right.own) - Number(left.own) ||
            Number(right.demanded) - Number(left.demanded),
        );
      let read = 0;
      let failed = 0;

      for (const target of due.slice(0, limit)) {
        if (await this.refresh(target)) read += 1;
        else failed += 1;
      }

      if (read + failed > 0) {
        this.logger.log(`Market radar: ${read} read, ${failed} failed, ${due.length} due.`);
      }

      return { due: due.length, failed, read, status: "done" };
    } finally {
      this.running = false;
    }
  }

  /** The radar of one search, for `/ma-recherche`. */
  async radar(userEmail: string, profileId: string): Promise<MarketRadarEntry[]> {
    const project = await this.searchProjects.findByProfileId(
      userEmail,
      profileId,
    );
    if (!project) return [];

    const romeCodes = await this.searchProjects.findRomeCodes(
      userEmail,
      profileId,
    );
    const departments = departmentsOf(project);
    const rows = await this.store.listByRegions(
      romeCodes,
      [...new Set(departments.map(regionOf))].filter(Boolean),
    );
    const byKey = new Map(
      rows.map((row) => [marketKey(row.romeCode, row.department), row]),
    );
    const entries: MarketRadarEntry[] = [];

    for (const romeCode of romeCodes) {
      for (const department of departments) {
        const local = byKey.get(marketKey(romeCode, department));
        if (!local) continue;

        entries.push({
          bestNeighbour: bestNeighbour(local, rows),
          local: toDepartmentStats(local),
          refreshedAt: local.refreshedAt.toISOString(),
          romeCode,
          romeLabel: local.romeLabel || romeCode,
        });
      }
    }

    return entries.slice(0, MAX_RADAR_ENTRIES);
  }

  /**
   * One job in one department, for the free tool (US-137). A pair never read
   * is queued for the next refresh and answers null: the visitor's request
   * never becomes a France Travail call.
   */
  async lookup(
    romeCode: string,
    department: string,
  ): Promise<StoredMarketStats | null> {
    const stored = await this.store.find(romeCode, department);

    if (!stored) {
      await this.store.recordDemand(romeCode, department, new Date(this.now()));
    }

    return stored;
  }

  async notesFor(input: {
    romeCodes: readonly string[];
    project: Pick<SearchProject, "locations">;
    since: Date;
  }): Promise<string[]> {
    const departments = departmentsOf(input.project);
    const rows = await this.store.listByRegions(
      input.romeCodes,
      [...new Set(departments.map(regionOf))].filter(Boolean),
    );

    return rows
      .filter(
        (row) =>
          departments.includes(row.department) &&
          row.changeNote !== null &&
          row.changedAt !== null &&
          row.changedAt >= input.since,
      )
      .map((row) => row.changeNote!);
  }

  /** One read. False when the API could not answer: the old figures stay. */
  private async refresh(target: Target): Promise<boolean> {
    const fromApi = await this.client.read(target.romeCode, target.department, {
      jobseekers: target.own || target.demanded,
    });
    if (!fromApi) return false;

    const since = new Date(this.now() - SALARY_WINDOW_DAYS * DAY_MS);
    const reading = {
      ...fromApi,
      region: regionOf(target.department),
      salary: medianSalary(
        await this.store.salaryLabels(target.romeCode, target.department, since),
        `offres vues depuis ${monthOf(since)}`,
      ),
    };
    const previous = await this.store.find(target.romeCode, target.department);

    await this.store.save(
      reading,
      target.own
        ? notableChange(previous, reading, departmentLabel(target.department))
        : null,
      new Date(this.now()),
    );

    return true;
  }
}

/**
 * Every confirmed job in every department of every search, then the pairs
 * visitors asked for, then the rest of each search's region — only tension
 * and offers there, to name the most promising.
 */
export function wantedTargets(
  searches: ReadonlyArray<{ project: SearchProject; romeCodes: string[] }>,
  demand: readonly Pair[] = [],
): Target[] {
  const targets = new Map<string, Target>();

  for (const { project, romeCodes } of searches) {
    for (const romeCode of romeCodes) {
      for (const department of departmentsOf(project)) {
        targets.set(marketKey(romeCode, department), {
          demanded: false,
          department,
          own: true,
          romeCode,
        });
      }
    }
  }

  const own = [...targets.values()];

  for (const { romeCode, department } of demand) {
    const key = marketKey(romeCode, department);
    const target = targets.get(key);

    if (target) target.demanded = true;
    else targets.set(key, { demanded: true, department, own: false, romeCode });
  }

  for (const target of own) {
    for (const department of regionNeighbours(target.department)) {
      const key = marketKey(target.romeCode, department);
      if (!targets.has(key)) {
        targets.set(key, {
          demanded: false,
          department,
          own: false,
          romeCode: target.romeCode,
        });
      }
    }
  }

  return [...targets.values()];
}

function departmentsOf(project: Pick<SearchProject, "locations">): string[] {
  return [
    ...new Set(
      project.locations
        .map((location) => location.department)
        .filter((department) => regionOf(department) !== ""),
    ),
  ];
}

/** The region's department with the most offers over a year, if it beats `local`. */
function bestNeighbour(
  local: StoredMarketStats,
  rows: readonly StoredMarketStats[],
): MarketDepartmentStats | null {
  const best = rows
    .filter(
      (row) =>
        row.romeCode === local.romeCode &&
        row.region === local.region &&
        row.department !== local.department &&
        row.offersYear !== null,
    )
    .sort(
      (left, right) =>
        (right.offersYear?.value ?? 0) - (left.offersYear?.value ?? 0),
    )[0];

  return best &&
    (best.offersYear?.value ?? 0) > (local.offersYear?.value ?? 0)
    ? toDepartmentStats(best)
    : null;
}

function toDepartmentStats(row: StoredMarketStats): MarketDepartmentStats {
  return {
    department: row.department,
    departmentLabel: departmentLabel(row.department),
    jobseekers: row.jobseekers,
    offers: row.offers,
    offersYear: row.offersYear,
    salary: row.salary,
    tension: row.tension,
  };
}

function monthOf(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    timeZone: "Europe/Paris",
    year: "numeric",
  }).format(date);
}

import type {
  HiringCompaniesView,
  HiringCompany,
  SearchProject,
} from "@cvforge/types";
import {
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import type { SearchProjectsStore } from "../search-projects/search-projects.types";
import { placeKey, placeOf, queryKey, type HiringPlace } from "./hiring-places";
import type {
  HiringCompaniesStore,
  StoredHiringCompany,
} from "./hiring-companies.pg-store";
import type { LaBonneBoiteSource } from "./la-bonne-boite.source";

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
/** Hiring potentials move slowly: a week keeps the list fresh enough. */
const REFRESH_EVERY_MS = 7 * DAY_MS;
const CHECK_INTERVAL_MS = HOUR_MS;
/** One call a reading at two a second: sixty is half a minute an hour. */
const MAX_READS_PER_CHECK = 60;
/** What the page shows at most, best potential first. */
const MAX_SHOWN = 100;

type Target = { key: string; romeCode: string; place: HiringPlace };

export type HiringRefreshOutcome =
  | { status: "skipped"; reason: "unavailable" | "running" }
  | { status: "done"; read: number; failed: number; due: number };

/**
 * "Entreprises qui recrutent" (US-119): La Bonne Boîte, for every confirmed
 * job and every place of every search, read once a week in the background.
 * The page only reads the copy.
 */
export class HiringCompaniesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HiringCompaniesService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly store: HiringCompaniesStore,
    private readonly source: LaBonneBoiteSource,
    private readonly searchProjects: Pick<
      SearchProjectsStore,
      "listAll" | "findByProfileId" | "findRomeCodes"
    >,
    private readonly now: () => number = Date.now,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.refreshDue().catch((error: unknown) => {
        this.logger.error(`Hiring companies refresh failed: ${String(error)}`);
      });
    }, CHECK_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async refreshDue(
    limit = MAX_READS_PER_CHECK,
  ): Promise<HiringRefreshOutcome> {
    if (!this.source.isAvailable()) {
      return { reason: "unavailable", status: "skipped" };
    }
    if (this.running) return { reason: "running", status: "skipped" };

    this.running = true;
    try {
      const targets = new Map<string, Target>();
      for (const search of await this.searchProjects.listAll()) {
        for (const target of targetsOf(search.project, search.romeCodes)) {
          targets.set(target.key, target);
        }
      }

      const refreshed = new Map(
        (await this.store.queries([...targets.keys()])).map((query) => [
          query.queryKey,
          query.refreshedAt,
        ]),
      );
      const due = [...targets.values()].filter((target) => {
        const at = refreshed.get(target.key);
        return !at || this.now() - at.getTime() >= REFRESH_EVERY_MS;
      });
      let read = 0;
      let failed = 0;

      for (const target of due.slice(0, limit)) {
        const reading = await this.source.search(target.romeCode, target.place);

        if (!reading) {
          failed += 1;
          continue;
        }

        await this.store.replace(
          {
            place: placeKey(target.place),
            queryKey: target.key,
            romeCode: target.romeCode,
          },
          reading,
          new Date(this.now()),
        );
        read += 1;
      }

      if (read + failed > 0) {
        this.logger.log(
          `Hiring companies: ${read} read, ${failed} failed, ${due.length} due.`,
        );
      }

      return { due: due.length, failed, read, status: "done" };
    } finally {
      this.running = false;
    }
  }

  /** What one search's page shows. */
  async view(userEmail: string, profileId: string): Promise<HiringCompaniesView> {
    const project = await this.searchProjects.findByProfileId(
      userEmail,
      profileId,
    );
    const romeCodes = project
      ? await this.searchProjects.findRomeCodes(userEmail, profileId)
      : [];

    if (!project || romeCodes.length === 0) {
      return { companies: [], refreshedAt: null, status: "no_rome" };
    }

    const targets = targetsOf(project, romeCodes);
    if (targets.length === 0) {
      return { companies: [], refreshedAt: null, status: "no_location" };
    }

    const keys = targets.map((target) => target.key);
    const queries = await this.store.queries(keys);
    if (queries.length === 0) {
      return { companies: [], refreshedAt: null, status: "pending" };
    }

    const labels = new Map(
      queries.map((query) => [query.queryKey, query.romeLabel || query.romeCode]),
    );
    const oldest = Math.min(...queries.map((query) => query.refreshedAt.getTime()));

    return {
      companies: bestBySiret(await this.store.companies(keys), labels).slice(
        0,
        MAX_SHOWN,
      ),
      refreshedAt: new Date(oldest).toISOString(),
      status: "ready",
    };
  }
}

/** Every confirmed job at every place of the search. */
export function targetsOf(
  project: Pick<SearchProject, "locations">,
  romeCodes: readonly string[],
): Target[] {
  const places = project.locations.flatMap((location) => {
    const place = placeOf(location);
    return place ? [place] : [];
  });

  return romeCodes.flatMap((romeCode) =>
    places.map((place) => ({ key: queryKey(romeCode, place), place, romeCode })),
  );
}

/**
 * One line per establishment: found for two jobs or two places, it keeps its
 * best potential and the job that gave it.
 */
function bestBySiret(
  rows: readonly StoredHiringCompany[],
  labels: ReadonlyMap<string, string>,
): HiringCompany[] {
  const best = new Map<string, StoredHiringCompany>();

  for (const row of rows) {
    const current = best.get(row.siret);
    if (!current || row.hiringPotential > current.hiringPotential) {
      best.set(row.siret, row);
    }
  }

  return [...best.values()]
    .sort((left, right) => right.hiringPotential - left.hiringPotential)
    .map((row) => {
      const romeCode = row.queryKey.split("|")[0] ?? "";

      return {
        city: row.city,
        headcountMax: row.headcountMax,
        headcountMin: row.headcountMin,
        highPotential: row.highPotential,
        hiringPotential: row.hiringPotential,
        nafLabel: row.nafLabel,
        name: row.name,
        postcode: row.postcode,
        romeCode,
        romeLabel: labels.get(row.queryKey) ?? romeCode,
        siret: row.siret,
      };
    });
}

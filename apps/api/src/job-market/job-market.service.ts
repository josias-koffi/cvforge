import {
  departmentLabel,
  isFrenchDepartment,
  MARKET_MIN_SALARY_SAMPLE,
  publicError,
  type PublicJobMarketResponse,
  type RomeAppellationOption,
} from "@cvforge/types";
import { BadRequestException } from "@nestjs/common";
import type { MarketStatsService } from "../market/market-stats.service";
import type { RomeAppellationsReader } from "../rome/rome-appellations.pg-reader";

const SUGGESTIONS_LIMIT = 8;
const MAX_QUERY_CHARS = 80;

export const APPELLATION_UNKNOWN_MESSAGE =
  "Choisissez un metier dans la liste proposee.";
export const DEPARTMENT_UNKNOWN_MESSAGE = "Choisissez un departement de la liste.";

/** A job and a department the tool accepted, both checked against our copies. */
export type JobMarketTarget = {
  appellation: RomeAppellationOption;
  department: string;
};

/**
 * The free "does this job hire near me?" tool (US-137). Reads the local ROME
 * copy and the radar's monthly figures only: a visitor's question never
 * becomes a France Travail call, it is queued for the next refresh.
 */
export class JobMarketService {
  constructor(
    private readonly appellations: Pick<RomeAppellationsReader, "search" | "find">,
    private readonly market: Pick<MarketStatsService, "lookup">,
  ) {}

  suggest(query: unknown): Promise<RomeAppellationOption[]> {
    const text = typeof query === "string" ? query.slice(0, MAX_QUERY_CHARS) : "";

    return this.appellations.search(text, SUGGESTIONS_LIMIT);
  }

  /** The job and the department, or a 400 naming which one is off. */
  async accept(raw: {
    appellation: unknown;
    department: unknown;
  }): Promise<JobMarketTarget> {
    const department =
      typeof raw.department === "string"
        ? raw.department.trim().toUpperCase()
        : "";

    if (!isFrenchDepartment(department)) {
      throw new BadRequestException(
        publicError("DEPARTMENT_UNKNOWN", DEPARTMENT_UNKNOWN_MESSAGE),
      );
    }

    const code =
      typeof raw.appellation === "string" ? raw.appellation.trim() : "";
    // Only a code of the referential: nothing a visitor types is queued.
    const appellation = /^\d{1,8}$/.test(code)
      ? await this.appellations.find(code)
      : null;

    if (!appellation) {
      throw new BadRequestException(
        publicError("ROME_APPELLATION_UNKNOWN", APPELLATION_UNKNOWN_MESSAGE),
      );
    }

    return { appellation, department };
  }

  async read(raw: {
    appellation: unknown;
    department: unknown;
  }): Promise<PublicJobMarketResponse> {
    const { appellation, department } = await this.accept(raw);
    const stored = await this.market.lookup(appellation.metierCode, department);
    const base = {
      appellation,
      department,
      departmentLabel: departmentLabel(department),
      salaryMinSample: MARKET_MIN_SALARY_SAMPLE,
    };

    if (!stored) {
      return { ...base, refreshedAt: null, stats: null, status: "collecting" };
    }

    return {
      ...base,
      refreshedAt: stored.refreshedAt.toISOString(),
      stats: {
        jobseekers: stored.jobseekers,
        offers: stored.offers,
        offersYear: stored.offersYear,
        salary: stored.salary,
        tension: stored.tension,
      },
      status: "ready",
    };
  }
}

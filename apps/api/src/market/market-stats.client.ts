import type { FtHttpClient } from "../france-travail/ft-http.client";
import type { FtResult } from "../france-travail/ft-result";
import {
  readJobseekers,
  readOffers,
  readRomeLabel,
  readTension,
  type IndicatorAnswer,
  type MarketReading,
} from "./market-stats.readings";

/**
 * How the API says "no figure for this job here" (2026-09-24): a 500 whose
 * message is "Le serveur n'a pas pu trouver la liste", or a 400 "n'est pas
 * disponible pour cet indicateur". An answer, not an outage.
 */
const NO_DATA = /pas pu trouver la liste|n'est pas disponible/;

/** The API could not be asked: the previous figures are kept, not erased. */
const UNAVAILABLE = Symbol("unavailable");

type Indicator = {
  path: string;
  nomenclature: string;
  period: "ANNEE" | "TRIMESTRE";
};

const TENSION: Indicator = {
  nomenclature: "TYPE_TENSION",
  path: "/indicateur/stat-perspective-employeur",
  period: "ANNEE",
};
const OFFERS: Indicator = {
  nomenclature: "ORIGINEOFF",
  path: "/indicateur/stat-offres",
  period: "TRIMESTRE",
};
const JOBSEEKERS: Indicator = {
  nomenclature: "CATCAND",
  path: "/indicateur/stat-demandeurs",
  period: "TRIMESTRE",
};

export type MarketApiReading = Omit<MarketReading, "region" | "salary">;

/**
 * France Travail's Marché du travail API (US-128), by ROME job and
 * department. Called by the monthly refresh only, never on a page view.
 */
export class MarketStatsClient {
  constructor(private readonly franceTravail: FtHttpClient) {}

  isAvailable(): boolean {
    return this.franceTravail.isEnabled("marche-travail");
  }

  /**
   * Tension and offers, plus the job seekers when asked: that answer weighs
   * 1.4 MB and only the candidate's own department shows it. Null when any
   * call could not be made.
   */
  async read(
    romeCode: string,
    department: string,
    options: { jobseekers: boolean },
  ): Promise<MarketApiReading | null> {
    const tension = await this.indicator(TENSION, romeCode, department);
    const offers = await this.indicator(OFFERS, romeCode, department);
    const jobseekers = options.jobseekers
      ? await this.indicator(JOBSEEKERS, romeCode, department)
      : null;

    if (
      tension === UNAVAILABLE ||
      offers === UNAVAILABLE ||
      jobseekers === UNAVAILABLE
    ) {
      return null;
    }

    return {
      department,
      jobseekers: readJobseekers(jobseekers),
      romeCode,
      romeLabel: readRomeLabel(offers, tension, jobseekers),
      tension: readTension(tension),
      ...readOffers(offers),
    };
  }

  private async indicator(
    indicator: Indicator,
    romeCode: string,
    department: string,
  ): Promise<IndicatorAnswer | null | typeof UNAVAILABLE> {
    const result: FtResult<IndicatorAnswer> =
      await this.franceTravail.request<IndicatorAnswer>("marche-travail", {
        body: {
          codeActivite: romeCode,
          codeTerritoire: department,
          codeTypeActivite: "ROME",
          codeTypeNomenclature: indicator.nomenclature,
          codeTypePeriode: indicator.period,
          codeTypeTerritoire: "DEP",
        },
        method: "POST",
        path: indicator.path,
      });

    if (result.kind === "ok") return result.data;
    if (result.kind === "empty") return null;

    return NO_DATA.test(result.detail) ? null : UNAVAILABLE;
  }
}

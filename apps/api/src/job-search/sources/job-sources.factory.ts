import {
  createFtHttpClient,
  type FtHttpClient,
} from "../../france-travail/ft-http.client";
import { FranceTravailSource } from "./france-travail.source";
import { resolveLaBonneAlternanceConfig } from "./la-bonne-alternance.config";
import { LaBonneAlternanceSource } from "./la-bonne-alternance.source";
import type { JobSourceAdapter } from "../job-search.types";

/** The adapters, built once so every service shares their caches and quotas. */
export const JOB_SOURCE_ADAPTERS = Symbol("JOB_SOURCE_ADAPTERS");

/**
 * The searchable sources, in the order they are queried.
 *
 * A source without credentials is left out rather than added and skipped: the
 * digest then reports "two sources" and means it. Adzuna is absent on purpose
 * — its terms need a written agreement first (ADR-023).
 */
export function buildJobSources(
  env: NodeJS.ProcessEnv = process.env,
  franceTravail: FtHttpClient = createFtHttpClient(env),
): JobSourceAdapter[] {
  const sources: JobSourceAdapter[] = [];

  if (franceTravail.isEnabled("offres")) {
    sources.push(new FranceTravailSource(franceTravail));
  }

  const laBonneAlternance = resolveLaBonneAlternanceConfig(env);

  if (laBonneAlternance.enabled) {
    sources.push(new LaBonneAlternanceSource(laBonneAlternance));
  }

  return sources;
}

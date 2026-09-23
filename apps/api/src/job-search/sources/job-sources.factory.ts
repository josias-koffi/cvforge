import { resolveFranceTravailConfig } from "./france-travail.config";
import { FranceTravailSource } from "./france-travail.source";
import type { JobSourceAdapter } from "../job-search.types";

/**
 * The searchable sources, in the order they are queried.
 *
 * A source without credentials is left out rather than added and skipped: the
 * digest then reports "two sources" and means it. Adzuna is absent on purpose
 * — its terms need a written agreement first (ADR-023).
 */
export function buildJobSources(
  env: NodeJS.ProcessEnv = process.env,
): JobSourceAdapter[] {
  const sources: JobSourceAdapter[] = [];
  const franceTravail = resolveFranceTravailConfig(env);

  if (franceTravail.enabled) {
    sources.push(new FranceTravailSource(franceTravail));
  }

  return sources;
}

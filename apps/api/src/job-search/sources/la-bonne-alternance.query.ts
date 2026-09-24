import type { JobSourceQuery } from "../job-search.types";

/**
 * Turning one of our queries into La bonne alternance's own vocabulary.
 *
 * Read off the live OpenAPI description (`/api/documentation/json`) on
 * 2026-09-23, not from memory. The striking part is what is **missing**:
 * there is no keyword parameter. The search takes ROME codes, an RNCP code, a
 * diploma level, a point and a radius, or department numbers — nothing else.
 *
 * A keyword query can only pass its department, and the scorer sorts the
 * rest out locally. A query by ROME job (US-124) passes `romes` as well: the
 * department alone is capped at 150 offers per source, so a candidate's job
 * could simply fall outside the page. On 2026-09-24 in 44, the department
 * alone gave 279 offers of every job; `romes=D1102` gave the 5 bakers.
 */
export interface LaBonneAlternanceParams {
  departements?: string;
  romes?: string;
}

/**
 * The parameters, or `null` when this query has no business here.
 *
 * The whole API only ever returns apprenticeship and professionalisation
 * contracts, so a query whose candidates did not ask for an alternance must
 * not trigger a call at all — it would bring back nothing they want and spend
 * quota doing it.
 *
 * Note that `contractTypes` is the *union* of the contracts wanted by every
 * candidate merged into this query, so a query can carry `alternance` "for"
 * one of them. That is harmless: the pool is shared and the selection is
 * still made candidate by candidate.
 */
export function toLaBonneAlternanceParams(
  query: JobSourceQuery,
): LaBonneAlternanceParams | null {
  if (!query.contractTypes.includes("alternance")) return null;

  const department = query.department.trim().toUpperCase();
  const romes = query.romeCodes.join(",");

  // No department means the whole of France, which the API accepts and which
  // is what a candidate ready to move asked for.
  return {
    ...(department ? { departements: department } : {}),
    ...(romes ? { romes } : {}),
  };
}

/**
 * What identifies the call itself, so that two queries differing only by
 * keywords — which this API ignores — are not asked twice, while a query by
 * ROME job is never answered from its department's page.
 */
export function cacheKeyFor(params: LaBonneAlternanceParams): string {
  const place = params.departements ?? "france";

  return params.romes ? `${place}|${params.romes}` : place;
}

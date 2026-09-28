/**
 * "kpis" and "kpi" are one term to a recruiter. Only the plural mark is
 * folded — a real stemmer would merge distinct trade words — and only when
 * comparing offer terms to a CV: `normalizeToken` feeds other dimensions where
 * this approximation has no place.
 */
export function foldPlural(token: string) {
  return token.length >= 4 && /[^s][sx]$/.test(token) ? token.slice(0, -1) : token;
}

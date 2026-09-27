/**
 * Where the browser loads a company's logo from: our own route, which goes
 * through the API's cache, never the source directly (ADR-025).
 */
export function companyLogoSrc(url: string | null | undefined): string | null {
  return url ? `/api/company-logos?src=${encodeURIComponent(url)}` : null
}

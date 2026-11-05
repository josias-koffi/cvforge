/**
 * The Workday tenants we read: a **closed list**, on purpose.
 *
 * Unlike the other recruiting software, a Workday board is not found from a
 * link or from a crawl. Each company was checked by hand on 2026-11-04 — the
 * tenant's robots.txt names no rule against the job list, and no terms of use
 * forbid it — and Thales or Kering, whose robots.txt blocks their whole site,
 * are absent. Adding a company here is a decision, not a side effect; the
 * adapter still reads robots.txt again at every pass and stops if it changed.
 *
 * The registry token is `<tenant>.<datacenter>/<site>` (`sanofi.wd3/SanofiCareers`):
 * the host is `<tenant>.<datacenter>.myworkdayjobs.com`.
 */
export interface WorkdayCompany {
  token: string;
  companyName: string;
}

export const WORKDAY_COMPANIES: readonly WorkdayCompany[] = [
  { companyName: "Air Liquide", token: "airliquidehr.wd3/AirLiquideExternalCareer" },
  { companyName: "Eiffage", token: "eiffage.wd3/Eiffage_Careers" },
  { companyName: "Renault Group", token: "alliancewd.wd3/renault-group-careers" },
  { companyName: "Sanofi", token: "sanofi.wd3/SanofiCareers" },
];

export interface WorkdayTarget {
  host: string;
  tenant: string;
  site: string;
}

/** `sanofi.wd3/SanofiCareers` → host, tenant and site; null when malformed. */
export function parseWorkdayToken(token: string): WorkdayTarget | null {
  const match = /^([a-z0-9-]+)\.(wd\d+)\/([A-Za-z0-9_.-]+)$/i.exec(token);
  if (!match) return null;

  const [, tenant = "", datacenter = "", site = ""] = match;

  return { host: `${tenant}.${datacenter}.myworkdayjobs.com`, site, tenant };
}

export function workdayCompanyName(token: string): string {
  return WORKDAY_COMPANIES.find((company) => company.token === token)?.companyName ?? "";
}

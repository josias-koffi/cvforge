import {
  departmentLabel,
  type CompanyPageEntry,
  type CompanyPageLink,
  type PublicCompanyPage,
} from "@cvforge/types";
import { NotFoundException } from "@nestjs/common";
import type { CompaniesStore } from "../companies/companies.pg-store";
import {
  employerPageOf,
  nafSectionOf,
  SIREN,
  toCompanyCheckSheet,
} from "../companies/company-record";
import {
  isIndexableCompany,
  type CompanyPagesStore,
  type IndexableCompany,
} from "./company-pages.pg-store";

/**
 * 4 500 companies are 9 000 URLs in two languages: with the 40 000 of the
 * job × department pages (US-138) and the static pages, one sitemap still
 * holds them all, under its 50 000.
 */
export const MAX_COMPANY_PAGES = 4_500;
const MAX_HIRING = 12;
const MAX_SAME_SECTOR = 6;

/**
 * The company pages of the landing (US-140): only companies the hourly
 * refresh already read, public and with a record worth a page. Read from its
 * copy: no source is asked on the way.
 */
export class CompanyPagesService {
  constructor(
    private readonly companies: Pick<CompaniesStore, "findMany">,
    private readonly pages: CompanyPagesStore,
  ) {}

  async list(): Promise<CompanyPageEntry[]> {
    const rows = await this.pages.listIndexable(MAX_COMPANY_PAGES);

    return rows.map(toEntry);
  }

  async page(rawSiren: string): Promise<PublicCompanyPage> {
    const siren = rawSiren.trim();
    const [stored] = SIREN.test(siren)
      ? await this.companies.findMany([siren])
      : [];

    if (!stored || !isIndexableCompany(stored)) {
      throw new NotFoundException("No page for this company.");
    }

    const [hiring, sameSector] = await Promise.all([
      this.pages.hiring(siren, MAX_HIRING),
      this.pages.listIndexableByNaf(stored.nafCode, MAX_SAME_SECTOR + 1),
    ]);

    return {
      company: toCompanyCheckSheet(siren, stored, {
        egapro:
          stored.egaproScore !== null && stored.egaproYear
            ? { score: stored.egaproScore, year: stored.egaproYear }
            : null,
        employerPage: employerPageOf(stored),
        nafSection: nafSectionOf(stored.nafCode),
      }),
      hiring: hiring.map((row) => ({
        ...row,
        departmentLabel: departmentLabel(row.department),
      })),
      name: stored.legalName,
      refreshedAt: stored.refreshedAt.toISOString(),
      sameSector: sameSector
        .filter((row) => row.siren !== siren)
        .slice(0, MAX_SAME_SECTOR)
        .map(toLink),
      siren,
    };
  }
}

function toLink(row: IndexableCompany): CompanyPageLink {
  return { name: row.legalName, siren: row.siren };
}

function toEntry(row: IndexableCompany): CompanyPageEntry {
  return { ...toLink(row), refreshedAt: row.refreshedAt.toISOString() };
}

import type { CompanyCheckSheet } from "./company-check";
import type { MarketPageLink } from "./market";

/**
 * The company pages of the landing (US-140): one per company the hourly
 * refresh already read, public and with enough of a record to be worth a
 * page. Read from that copy only.
 */

export interface CompanyPageLink {
  siren: string;
  name: string;
}

export interface CompanyPageEntry extends CompanyPageLink {
  /** When the record was read, ISO: the sitemap's `lastModified`. */
  refreshedAt: string;
}

/** A job it hires for in one department, per La Bonne Boîte. */
export interface CompanyPageHiring extends MarketPageLink {
  city: string;
  /** Whether that job × department has its page (US-138), to link to. */
  hasMarketPage: boolean;
}

export interface PublicCompanyPage extends CompanyPageEntry {
  company: CompanyCheckSheet;
  hiring: CompanyPageHiring[];
  /** Other companies of the same NAF code that have a page. */
  sameSector: CompanyPageLink[];
}

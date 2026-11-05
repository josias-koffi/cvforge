import type { NormalizedJobListing } from "../../job-search.types";
import { classifyContract, htmlToText, normalizeLocation } from "../../job-listing.normalize";
import { BOARD_USER_AGENT, type BoardHttpClient } from "./board-http";
import {
  BoardNotFoundError,
  BoardRefusedError,
  type CompanyBoardAdapter,
  type FetchBoardOptions,
} from "./board.types";
import { isoDate } from "./greenhouse.board";
import { isPathAllowed } from "./robots-rules";
import { parseWorkdayToken, workdayCompanyName, type WorkdayTarget } from "./workday.config";

/**
 * Workday's public career-site API (`/wday/cxs/<tenant>/<site>/jobs`), the
 * same JSON the company's own careers page loads.
 *
 * - The list is asked for **France only**, through Workday's own country
 *   facet, so a group-wide board (Sanofi: 1 046 offers, 142 in France) costs
 *   what its French share costs.
 * - A page is 20 offers at most and the list stops at 2 000: past that the
 *   newest are read and the rest wait for the facets to narrow them.
 * - The advert text needs one more call per offer. Offers already seen
 *   (frequent pass) or already read today (this adapter's own memory) are not
 *   asked for again, and a run reads at most `MAX_DETAILS_PER_RUN` new ones:
 *   a board of 2 000 fills over a few days instead of in one burst. An offer
 *   not read yet is left out rather than returned empty, so it can never
 *   overwrite a stored advert with a blank one.
 * - robots.txt is read again at every pass (cached for an hour) and the pass
 *   stops if it forbids the job list or the careers site. It is how Thales
 *   and Kering were ruled out.
 */
interface WorkdayListItem {
  title?: string;
  externalPath?: string;
  locationsText?: string | null;
  postedOn?: string;
  startDate?: string;
  bulletFields?: string[];
}

interface WorkdayList {
  total?: number;
  jobPostings?: WorkdayListItem[];
}

interface WorkdayDetail {
  jobPostingInfo?: {
    title?: string;
    jobDescription?: string;
    location?: string;
    startDate?: string;
    postedOn?: string;
    timeType?: string;
    jobReqId?: string;
    externalUrl?: string;
    remoteType?: string;
    country?: { descriptor?: string };
  };
}

/** Workday's own id for France, the same on every tenant. */
const FRANCE_COUNTRY_ID = "54c5b6971ffb4bf0b116fe7651ec789a";
const PAGE_SIZE = 20;
/** Workday refuses to page past 2 000 results. */
const MAX_PAGES = 100;
const MAX_DETAILS_PER_RUN = 400;
const ROBOTS_TTL_MS = 60 * 60_000;
const DAY_MS = 86_400_000;

export class WorkdayBoard implements CompanyBoardAdapter {
  readonly provider = "workday" as const;
  private readonly robots = new Map<string, { checkedAt: number }>();
  private readonly read = new Map<string, NormalizedJobListing>();

  constructor(
    private readonly http: BoardHttpClient,
    private readonly now: () => number = Date.now,
  ) {}

  async fetchBoard(
    boardToken: string,
    options: FetchBoardOptions = {},
  ): Promise<NormalizedJobListing[]> {
    const target = parseWorkdayToken(boardToken);
    if (!target) throw new BoardNotFoundError(this.provider, boardToken);

    await this.assertAllowed(target);

    const items = await this.listFrance(target);
    const listings: NormalizedJobListing[] = [];
    let details = 0;

    for (const item of items) {
      const path = item.externalPath?.trim() ?? "";
      if (!path) continue;

      const id = idOf(item, path);
      if (options.skipExternalIds?.has(id)) continue;

      const cached = this.read.get(cacheKey(boardToken, id));
      if (cached) {
        listings.push(cached);
        continue;
      }
      if (details >= MAX_DETAILS_PER_RUN) continue;
      details += 1;

      const listing = await this.toListing(target, boardToken, item, path, id);
      if (!listing) continue;

      this.read.set(cacheKey(boardToken, id), listing);
      listings.push(listing);
    }

    this.forgetClosed(boardToken, items);

    return listings;
  }

  /** The offers located in France, newest first, 20 at a time. */
  private async listFrance(target: WorkdayTarget): Promise<WorkdayListItem[]> {
    const url = `https://${target.host}/wday/cxs/${target.tenant}/${target.site}/jobs`;
    const items: WorkdayListItem[] = [];
    // Workday states the total on the first page only; the others say 0.
    let total = 0;

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const answer = await this.http.postJson<WorkdayList>(this.provider, url, {
        appliedFacets: { locationCountry: [FRANCE_COUNTRY_ID] },
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        searchText: "",
      });
      const postings = answer.jobPostings ?? [];
      items.push(...postings);
      if (page === 0) total = answer.total ?? 0;

      if (postings.length < PAGE_SIZE || items.length >= total) break;
    }

    return items;
  }

  private async toListing(
    target: WorkdayTarget,
    boardToken: string,
    item: WorkdayListItem,
    path: string,
    id: string,
  ): Promise<NormalizedJobListing | null> {
    const title = item.title?.trim() ?? "";
    if (!title) return null;

    const answer = await this.http.getJson<WorkdayDetail>(
      this.provider,
      `https://${target.host}/wday/cxs/${target.tenant}/${target.site}${path}`,
    );
    const info = answer.jobPostingInfo;
    if (!info) return null;

    // The country facet already kept France; a detail that says otherwise is
    // a multi-site posting whose first place abroad matched, not a French offer.
    const country = info.country?.descriptor?.trim() ?? "France";
    if (!/france/i.test(country)) return null;

    const description = htmlToText(info.jobDescription ?? "");
    const located = normalizeLocation(info.location ?? item.locationsText ?? "", {
      countryHint: country,
      remoteHint: /remote|télétravail/i.test(info.remoteType ?? ""),
    });
    const url =
      info.externalUrl?.trim() ||
      `https://${target.host}/${target.site}${path}`;

    return {
      applyUrl: url,
      companyAnonymous: false,
      companyName: workdayCompanyName(boardToken) || target.tenant,
      contractType: classifyContract({ description, title }),
      department: located.department,
      description,
      externalId: id,
      latitude: null,
      locationLabel: located.label,
      longitude: null,
      partnerUrls: [],
      publishedAt: this.publishedAt(info.startDate ?? item.startDate, info.postedOn ?? item.postedOn),
      raw: { ...info, jobDescription: undefined },
      remote: located.remote,
      salaryLabel: "",
      source: this.provider,
      title,
      url,
    };
  }

  /** The absolute start date when there is one, else the list's "Posted 3 Days Ago". */
  private publishedAt(startDate: string | undefined, postedOn: string | undefined): string | null {
    const absolute = isoDate(startDate);
    if (absolute) return absolute;

    const text = (postedOn ?? "").toLowerCase();
    const now = this.now();
    if (text.includes("today")) return new Date(now).toISOString();
    if (text.includes("yesterday")) return new Date(now - DAY_MS).toISOString();

    const days = /(\d+)\+?\s*days?/.exec(text);

    return days ? new Date(now - Number(days[1]) * DAY_MS).toISOString() : null;
  }

  /** Stops the pass when the tenant's robots.txt forbids what we are about to call. */
  private async assertAllowed(target: WorkdayTarget): Promise<void> {
    const key = target.host;
    const checked = this.robots.get(key);
    if (checked && this.now() - checked.checkedAt < ROBOTS_TTL_MS) return;

    let robotsTxt = "";
    try {
      robotsTxt = await this.http.getText(
        this.provider,
        `https://${target.host}/robots.txt`,
        "text/plain, */*",
      );
    } catch (error) {
      // No robots.txt at all is no rule; anything else is a failure to report.
      if (!(error instanceof BoardNotFoundError)) throw error;
    }

    // Our client's name and the name robots.txt files were probed under.
    const agents = [BOARD_USER_AGENT.split("/")[0] ?? "", "JobSparkBot"];
    const paths = [
      `/wday/cxs/${target.tenant}/${target.site}/jobs`,
      `/${target.site}/`,
    ];
    const forbidden = paths.some((path) =>
      agents.some((agent) => !isPathAllowed(robotsTxt, agent, path)),
    );
    if (forbidden) throw new BoardRefusedError(this.provider, 403);

    this.robots.set(key, { checkedAt: this.now() });
  }

  /** Drops what the board no longer lists, so the memory cannot grow for ever. */
  private forgetClosed(boardToken: string, items: readonly WorkdayListItem[]): void {
    const open = new Set(
      items.map((item) => cacheKey(boardToken, idOf(item, item.externalPath?.trim() ?? ""))),
    );

    for (const key of this.read.keys()) {
      if (key.startsWith(`${boardToken}|`) && !open.has(key)) this.read.delete(key);
    }
  }
}

/** The requisition number (`JR2026-5752`), stable across edits; the path's last part otherwise. */
function idOf(item: WorkdayListItem, path: string): string {
  const requisition = item.bulletFields?.find((field) => /^[A-Z]{1,3}[-_]?\d/.test(field));

  return requisition?.trim() || (path.split("_").pop() ?? path).trim();
}

function cacheKey(boardToken: string, id: string): string {
  return `${boardToken}|${id}`;
}

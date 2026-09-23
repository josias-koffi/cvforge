import { Injectable, Logger } from "@nestjs/common";
import type { ApplicationsService } from "../applications/applications.service";
import { dateInParis } from "./job-digest.service";
import type { JobSourceAdapter } from "./job-search.types";
import type { JobsStore, StoredJobListing } from "./jobs.types";
import type {
  JobMatchStatus,
  JobMatchWithJob,
  JobMatchesStore,
  StoredJobMatch,
} from "./matches.types";

/** Enough text for the offer analysis to have something to read. */
const MIN_OFFER_TEXT_LENGTH = 160;

export interface DigestView {
  digestDate: string;
  matches: Array<JobMatchWithJob & { listings: StoredJobListing[] }>;
}

export type ApplyOutcome =
  | { outcome: "applied"; applicationId: string }
  | { outcome: "closed" }
  | { outcome: "not_found" };

/**
 * What the candidate does with their offers of the day: read them, keep or
 * dismiss them, and turn one into an application.
 */
@Injectable()
export class JobMatchesService {
  private readonly logger = new Logger(JobMatchesService.name);

  constructor(
    private readonly matches: JobMatchesStore,
    private readonly jobs: JobsStore,
    private readonly applications: ApplicationsService,
    private readonly sources: JobSourceAdapter[],
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * A day's selection, each offer with every source that publishes it — that
   * is the "Disponible sur" line, and the licences require those links.
   */
  async getDigest(userEmail: string, date: string | null): Promise<DigestView> {
    const digestDate = date ?? dateInParis(this.now());
    const matches = await this.matches.listByDigestDate(userEmail, digestDate);

    return {
      digestDate,
      matches: await this.withListings(matches),
    };
  }

  async listRecent(userEmail: string, limit: number) {
    return this.withListings(await this.matches.listRecent(userEmail, limit));
  }

  async setStatus(
    userEmail: string,
    matchId: string,
    status: JobMatchStatus,
  ): Promise<StoredJobMatch | null> {
    return this.matches.setStatus(userEmail, matchId, status);
  }

  /**
   * Creates the application, from the advert text we already hold.
   *
   * The offer is checked live first: a company that forgot to take its advert
   * down must not cost the candidate a credit and an afternoon. Only then does
   * the existing import run — the same one, with the same analysis and the
   * same price as pasting an offer by hand.
   */
  async applyToMatch(userEmail: string, matchId: string): Promise<ApplyOutcome> {
    const match = await this.matches.findById(userEmail, matchId);
    if (!match) return { outcome: "not_found" };

    const found = await this.jobs.findById(match.jobId);
    const listings = found?.listings ?? [];

    if (!(await this.isStillOpen(listings))) return { outcome: "closed" };

    const application = await this.createApplication(userEmail, match);
    await this.matches.setStatus(userEmail, matchId, "applied", application.id);

    return { applicationId: application.id, outcome: "applied" };
  }

  /**
   * Asks the sources that can answer. Silence is not a closure: only an
   * explicit "gone" from every open advert closes the offer.
   */
  private async isStillOpen(listings: StoredJobListing[]): Promise<boolean> {
    const open = listings.filter((listing) => !listing.closedAt);
    if (open.length === 0) return false;

    let closedCount = 0;

    for (const listing of open) {
      const source = this.sources.find(
        (candidate) => candidate.source === listing.source,
      );
      if (!source) continue;

      if ((await source.isStillOpen(listing.externalId)) === false) {
        closedCount += 1;
        await this.jobs.closeListing(
          listing.source,
          listing.externalId,
          new Date(this.now()).toISOString(),
        );
      }
    }

    return closedCount < open.length;
  }

  /**
   * The advert text first, the URL as a fallback. A board gives us the whole
   * text already, so re-fetching the page would only add a way to fail.
   */
  private async createApplication(userEmail: string, match: JobMatchWithJob) {
    const description = match.job.description.trim();

    if (description.length >= MIN_OFFER_TEXT_LENGTH) {
      const application = await this.applications.importFromText(
        userEmail,
        description,
      );

      if (match.job.primaryUrl) {
        // Keeps the link on the application, so the candidate can reopen the
        // advert from their own follow-up screen.
        await this.applications.updateOffer(userEmail, application.id, {
          offerUrl: match.job.primaryUrl,
        });
      }

      return application;
    }

    this.logger.debug(
      `Job ${match.jobId} has too little text; importing from its URL instead.`,
    );

    return this.applications.importFromUrl(userEmail, match.job.primaryUrl);
  }

  private async withListings(matches: JobMatchWithJob[]) {
    const detailed = [];

    for (const match of matches) {
      const found = await this.jobs.findById(match.jobId);
      detailed.push({ ...match, listings: found?.listings ?? [] });
    }

    return detailed;
  }
}

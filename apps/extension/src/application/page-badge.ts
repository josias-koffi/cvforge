import {
  badgeFor,
  knownOfferFor,
  type Badge,
  type KnownOffer,
  type PageSignals,
} from "../domain/badge";
import { isWebPage } from "../domain/offer";
import type { JobSparkTools } from "./session";

/** The browser side of the badge. */
export interface BadgeHost {
  canReadPages(): Promise<boolean>;
  /** The page's signals, or null when it cannot be read. */
  probe(tabId: number): Promise<PageSignals | null>;
  show(tabId: number, badge: Badge | null): Promise<void>;
}

type Listed = {
  applyUrl?: string | null;
  offerUrl?: string | null;
  score?: number | null;
  title?: string | null;
};

/** Offers are listed again after this long. */
const OFFERS_TTL_MS = 10 * 60 * 1000;

/**
 * The icon's badge (US-207), per tab, after each page load: the score of an
 * offer JobSpark proposed, or « ✓ » on a form the extension can fill.
 */
export class PageBadge {
  private offers: { at: number; list: Promise<KnownOffer[]> } | null = null;

  constructor(
    private readonly deps: {
      tools: JobSparkTools;
      host: BadgeHost;
      now?: () => number;
    },
  ) {}

  async update(tabId: number, url: string | undefined): Promise<Badge | null> {
    if (!isWebPage(url) || !(await this.deps.host.canReadPages())) {
      await this.deps.host.show(tabId, null);
      return null;
    }
    const [signals, offers] = await Promise.all([
      this.deps.host.probe(tabId).catch(() => null),
      this.knownOffers(),
    ]);
    const badge = badgeFor(url, signals, knownOfferFor(offers, url));
    await this.deps.host.show(tabId, badge);
    return badge;
  }

  /** Forgets the offers: after a new connection or a disconnection. */
  reset() {
    this.offers = null;
  }

  private knownOffers(): Promise<KnownOffer[]> {
    const now = (this.deps.now ?? Date.now)();
    if (!this.offers || now - this.offers.at > OFFERS_TTL_MS) {
      this.offers = { at: now, list: this.listOffers() };
    }
    return this.offers.list;
  }

  /** Recent offers (scored), this morning's, and prepared applications. */
  private async listOffers(): Promise<KnownOffer[]> {
    const read = (name: string, args?: Record<string, unknown>) =>
      this.deps.tools.call(name, args).catch(() => null);
    const [recent, daily, applications] = await Promise.all([
      read("list_recent_offers", { limit: 50 }),
      read("get_daily_offers"),
      read("list_applications"),
    ]);
    const all: Listed[] = [
      ...((daily as { matches?: Listed[] } | null)?.matches ?? []),
      ...(Array.isArray(recent) ? (recent as Listed[]) : []),
      ...(Array.isArray(applications) ? (applications as Listed[]) : []),
    ];
    return all.flatMap((entry) => {
      const url = entry.applyUrl ?? entry.offerUrl;
      return url
        ? [{ score: entry.score ?? null, title: entry.title ?? "", url }]
        : [];
    });
  }
}

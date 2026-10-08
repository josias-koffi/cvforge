import { companyKey, simhash, titleKey, urlKey } from "./job-keys";
import { matchJob, type MatchCandidate, type MatchSubject } from "./match-job";

/**
 * Undoing the merges today's rules would not make (2026-10-08).
 *
 * Two flaws merged unrelated adverts into one job: links of single-page
 * applications lost their "#/" route, so every Beetween advert shared one
 * key (547 adverts in one job), and anonymous adverts merged on their
 * description alone, across departments. An advert already stored keeps its
 * job at every collection, so those merges stay until they are undone here.
 */

export interface RepairListing {
  id: string;
  matchMethod: string;
  /** Every link the advert carries: its own, its application link, partners'. */
  urls: string[];
  title: string;
  companyName: string;
  companyAnonymous: boolean;
  department: string;
  description: string;
  publishedAt: string | null;
  firstSeenAt: string;
}

/**
 * The adverts of one job that do not belong to it.
 *
 * The advert that opened the job anchors it; another stays when it shares a
 * link with an advert that stays, or would still be merged with one. Read
 * that way, a job published on France Travail, then on the company's board,
 * then relayed by a partner keeps its three adverts. Merges decided by an
 * admin or on the exact company and title are never undone.
 */
export function listingsToDetach(listings: readonly RepairListing[]): string[] {
  if (listings.length < 2) return [];

  const ordered = [...listings].sort(
    (left, right) =>
      Number(right.matchMethod === "new") -
        Number(left.matchMethod === "new") ||
      left.firstSeenAt.localeCompare(right.firstSeenAt),
  );
  const kept = [ordered[0]!];
  let pending = ordered.slice(1).filter((listing) => {
    const certain =
      listing.matchMethod === "manual" || listing.matchMethod === "strict_key";
    if (certain) kept.push(listing);
    return !certain;
  });

  // Until nothing moves: an advert may belong through one kept only later.
  for (let moved = true; moved && pending.length > 0; ) {
    moved = false;
    pending = pending.filter((listing) => {
      if (!kept.some((anchor) => belongsWith(listing, anchor))) return true;

      kept.push(listing);
      moved = true;
      return false;
    });
  }

  return pending.map((listing) => listing.id);
}

function belongsWith(listing: RepairListing, anchor: RepairListing): boolean {
  const anchorKeys = new Set(anchor.urls.map(urlKey).filter(Boolean));
  if (listing.urls.some((url) => anchorKeys.has(urlKey(url)))) return true;

  return matchJob(subjectOf(listing), [candidateOf(anchor)]) !== null;
}

function subjectOf(listing: RepairListing): MatchSubject {
  return {
    companyAnonymous: listing.companyAnonymous,
    companyKey: companyKey(listing.companyName),
    department: listing.department,
    descriptionSimhash: simhash(listing.description),
    publishedAt: listing.publishedAt,
    title: listing.title,
    titleKey: titleKey(listing.title),
  };
}

function candidateOf(listing: RepairListing): MatchCandidate {
  const { title: _title, ...subject } = subjectOf(listing);

  return { ...subject, jobId: listing.id };
}

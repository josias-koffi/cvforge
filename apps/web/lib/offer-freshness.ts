import type { JobMatch } from "@/lib/job-search"

/**
 * How fresh an offer is, and which ones arrived since the candidate last
 * looked (E27, US-167). Since the collection runs every few minutes, "today"
 * no longer says enough: an offer published 12 minutes ago is the one to
 * answer first.
 */

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** When the candidate last left « Offres du jour », as an ISO date. */
export const OFFERS_VISIT_COOKIE = "jobspark_offers_visit"

/**
 * Paris, whatever the server's or the browser's zone: the candidate reads
 * the date of a French offer on French time.
 */
const parisDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
})

/** « à l'instant », « il y a 12 min », « il y a 3 h », then « le 2 oct. ». */
export function formatFreshness(
  value: string | null | undefined,
  now: number = Date.now()
) {
  const time = value ? Date.parse(value) : Number.NaN
  if (Number.isNaN(time)) return null

  const elapsed = Math.max(0, now - time)
  if (elapsed < MINUTE_MS) return "à l'instant"
  if (elapsed < HOUR_MS) return `il y a ${Math.floor(elapsed / MINUTE_MS)} min`
  if (elapsed < DAY_MS) return `il y a ${Math.floor(elapsed / HOUR_MS)} h`

  return `le ${parisDate.format(new Date(time))}`
}

/** What the offer says of its own date: its publication, else our first sight. */
export function publishedTime(match: Pick<JobMatch, "job">) {
  return Date.parse(match.job.publishedAt ?? match.job.firstSeenAt) || 0
}

/**
 * Splits the offers into those that arrived since the last visit — the
 * latest published first — and the others, in their order. Without a
 * readable last visit, nothing is "new": a first visit is all new.
 */
export function splitSinceVisit<T extends Pick<JobMatch, "job" | "createdAt">>(
  matches: readonly T[],
  lastVisit: string | null | undefined
): { fresh: T[]; rest: T[] } {
  const since = lastVisit ? Date.parse(lastVisit) : Number.NaN
  if (Number.isNaN(since)) return { fresh: [], rest: [...matches] }

  const isFresh = (match: T) => Date.parse(match.createdAt) > since

  return {
    fresh: matches
      .filter(isFresh)
      .sort((left, right) => publishedTime(right) - publishedTime(left)),
    rest: matches.filter((match) => !isFresh(match)),
  }
}

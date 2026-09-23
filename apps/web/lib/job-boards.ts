import type { JobListingSummary, JobOffer } from "@/lib/job-search"

/**
 * Types and wording of the company registry. No data fetching here: the page
 * calls `api()` itself, and a client component importing a label from a module
 * that pulls the API client would drag it into the browser bundle.
 */
export const BOARD_PROVIDERS = [
  "greenhouse",
  "lever",
  "ashby",
  "smartrecruiters",
  "workable",
  "recruitee",
  "personio",
  "welcomekit",
] as const

export type BoardProvider = (typeof BOARD_PROVIDERS)[number]

/** How a company reached the registry — useful to judge a surprising row. */
export type BoardOrigin =
  | "seed"
  | "crawl"
  | "france_travail"
  | "user"
  | "admin"

export interface RegisteredBoard {
  provider: BoardProvider
  boardToken: string
  companyName: string
  enabled: boolean
  origin: BoardOrigin
  lastFetchedAt: string | null
  lastStatus: string | null
  lastJobCount: number
  consecutiveFailures: number
  createdAt: string
}

/** How an advert was attached to its offer: the last one is the reviewable one. */
export type MatchMethod = "url" | "strict_key" | "fuzzy" | "new" | "manual"

/** An advert as the admin reviews it — richer than the candidate's summary. */
export interface MergeListing extends JobListingSummary {
  jobId: string
  externalId: string
  title: string
  companyName: string
  publishedAt: string | null
  firstSeenAt: string
  lastSeenAt: string
  matchMethod: MatchMethod
}

export interface FuzzyMerge {
  job: JobOffer
  listings: MergeListing[]
}

export const PROVIDER_LABELS: Record<BoardProvider, string> = {
  ashby: "Ashby",
  greenhouse: "Greenhouse",
  lever: "Lever",
  personio: "Personio",
  recruitee: "Recruitee",
  smartrecruiters: "SmartRecruiters",
  welcomekit: "Welcome Kit",
  workable: "Workable",
}

export const ORIGIN_LABELS: Record<BoardOrigin, string> = {
  admin: "Ajoutée à la main",
  crawl: "Découverte (Common Crawl)",
  france_travail: "Lien d'une offre France Travail",
  seed: "Liste de départ",
  user: "Candidature d'un utilisateur",
}

/** What a run did: `digest` selects and notifies afterwards, `collect` stops. */
export type DigestRunKind = "digest" | "collect"

export interface DigestRun {
  id: string
  runDate: string
  kind: DigestRunKind
  status: "running" | "done" | "failed"
  stats: Record<string, number | string[]> | null
  startedAt: string
  finishedAt: string | null
}

/** The windows France Travail accepts; anything else is a 400 on their side. */
export const COLLECTION_WINDOWS = [1, 7, 31] as const

export const RUN_KIND_LABELS: Record<DigestRunKind, string> = {
  collect: "Collecte seule",
  digest: "Sélection du matin",
}

export const RUN_STATUS_LABELS: Record<DigestRun["status"], string> = {
  done: "Terminée",
  failed: "Échouée",
  running: "En cours",
}

/** The figures worth a column, in the order they tell the story. */
export const RUN_STAT_LABELS: Record<string, string> = {
  boardsDiscovered: "entreprises découvertes",
  boardsRead: "entreprises lues",
  jobsCreated: "offres uniques",
  listingsCollected: "annonces",
  matchesWritten: "offres proposées",
  notificationsSent: "notifications",
  projects: "recherches",
}

/** A source as the admin sees it: what it is, and what it last did. */
export interface JobSourceState {
  source: string
  enabled: boolean
  /** Has an adapter at all. */
  implemented: boolean
  /** Configured to be able to answer, credentials included. */
  available: boolean
  lastRunAt: string | null
  lastStatus: string | null
  lastListingCount: number
  consecutiveFailures: number
}

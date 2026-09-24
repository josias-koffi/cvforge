import type { ScoreBreakdown, SearchContractType } from "@cvforge/types"

import { api } from "@/lib/api"

/** One source that publishes an offer — what the "Disponible sur" line lists. */
export interface JobListingSummary {
  id: string
  source: string
  url: string
  applyUrl: string
  closedAt: string | null
}

export interface JobOffer {
  id: string
  title: string
  companyName: string
  companyAnonymous: boolean
  locationLabel: string
  department: string
  /** Set when the source gave a geocoded place — France Travail often does. */
  latitude: number | null
  longitude: number | null
  remote: boolean
  contractType: SearchContractType | "unknown"
  salaryLabel: string
  description: string
  primaryUrl: string
  publishedAt: string | null
  firstSeenAt: string
  closedAt: string | null
  /** The ROME métier France Travail filed it under; absent on older offers. */
  romeCode?: string | null
}

export type JobMatchStatus = "new" | "seen" | "saved" | "dismissed" | "applied"

/**
 * One offer as the cards and the detail panel need it, wherever it comes from.
 *
 * The morning selection carries a score, an explanation and the skills that
 * matched; an offer found by searching carries none of them, and the interface
 * leaves them out rather than showing a zero.
 */
export interface JobCardOffer {
  job: JobOffer
  listings: JobListingSummary[]
  status: JobMatchStatus | null
  score: number | null
  /** Points per criterion behind `score`; absent on older selections. */
  scoreBreakdown?: ScoreBreakdown | null
  aiReason: string | null
  /** What the candidate has: their own skills, then ROME competences. */
  matchedSkills?: string[]
  /** What the offer asks that the CV does not show, required first (US-126). */
  missingSkills?: string[]
}

export interface JobMatch {
  id: string
  jobId: string
  digestDate: string
  score: number
  scoreBreakdown: ScoreBreakdown | null
  matchedSkills: string[]
  missingSkills?: string[]
  aiRank: number | null
  aiReason: string | null
  status: JobMatchStatus
  applicationId: string | null
  job: JobOffer
  listings: JobListingSummary[]
}

export interface JobDigest {
  digestDate: string
  matches: JobMatch[]
}

export async function loadDigest(date?: string): Promise<JobDigest> {
  return api<JobDigest>("/job-search/digest", {
    query: date ? { date } : {},
  })
}

export interface OfferSearchResult {
  job: JobOffer
  listings: JobListingSummary[]
  status: JobMatchStatus | null
  /** Only set when the offer came from a morning selection. */
  score: number | null
  scoreBreakdown: ScoreBreakdown | null
  aiReason: string | null
  applicationId: string | null
}

export interface OfferSearchFilters {
  q?: string
  departement?: string
  contrat?: string
  teletravail?: string
  page?: string
}

export async function searchOffers(filters: OfferSearchFilters) {
  return api<{
    offers: OfferSearchResult[]
    total: number
    /** Offers held in the base, criteria aside: an empty base is not a failed search. */
    available: number
    page: number
    pageSize: number
  }>("/job-search/offers", {
    query: {
      contrat: filters.contrat,
      departement: filters.departement,
      page: filters.page,
      q: filters.q,
      teletravail: filters.teletravail,
    },
  })
}

export async function loadRecentMatches(limit = 60): Promise<JobMatch[]> {
  const { matches } = await api<{ matches: JobMatch[] }>(
    "/job-search/history",
    {
      query: { limit },
    }
  )

  return matches
}

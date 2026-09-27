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
  /** The employer's logo at its source, "" when none is known (ADR-025). */
  companyLogoUrl?: string
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

export interface OfferRequirement {
  label: string
  required: boolean
}

/**
 * What an advert says beyond its text, read by the API from the payload each
 * source publishes. Every field is empty when the source does not give it.
 */
export interface OfferDetails {
  /** The source these details come from, always named to the candidate. */
  source: string
  /** The job board France Travail relays the offer from, "" when none. */
  via: string
  /** Where the candidate actually applies — often not France Travail. */
  apply: {
    url: string
    target: "employer" | "partner" | "source"
    host: string
    /** The partner board's name, e.g. "Meteojob"; "" otherwise. */
    name?: string
  } | null
  /** The employer's careers page or website, "" when unknown. */
  companyWebsite: string
  companyDescription: string
  companyBadges: string[]
  facts: Array<{ label: string; value: string }>
  salary: { label: string; comment: string; benefits: string[] } | null
  experience: { label: string; required: boolean; comment: string } | null
  education: OfferRequirement[]
  languages: OfferRequirement[]
  licences: OfferRequirement[]
  softSkills: Array<{ label: string; description: string }>
  sections: Array<{ title: string; text: string }>
  contact: { name: string; email: string; lines: string[] } | null
  lacksCandidates: boolean
}

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
  /** Absent from pages served before the API sent it. */
  details?: OfferDetails | null
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
  details?: OfferDetails | null
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
  details?: OfferDetails | null
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

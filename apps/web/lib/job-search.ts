import type { SearchContractType } from "@cvforge/types"

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
  remote: boolean
  contractType: SearchContractType | "unknown"
  salaryLabel: string
  description: string
  primaryUrl: string
  publishedAt: string | null
  firstSeenAt: string
  closedAt: string | null
}

export type JobMatchStatus = "new" | "seen" | "saved" | "dismissed" | "applied"

export interface JobMatch {
  id: string
  jobId: string
  digestDate: string
  score: number
  matchedSkills: string[]
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

export async function loadRecentMatches(limit = 60): Promise<JobMatch[]> {
  const { matches } = await api<{ matches: JobMatch[] }>("/job-search/history", {
    query: { limit },
  })

  return matches
}

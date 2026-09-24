import type { MarketRadarEntry } from "@cvforge/types"

import { api } from "@/lib/api"

/**
 * The labour market around a search (US-128): figures read once a month from
 * France Travail. None yet — no confirmed job, or the first reading has not
 * run — is an empty list, not an error.
 */
export async function loadMarketRadar(
  profileId: string
): Promise<MarketRadarEntry[]> {
  try {
    const { entries } = await api<{ entries: MarketRadarEntry[] }>(
      `/profiles/${encodeURIComponent(profileId)}/market`
    )

    return entries
  } catch {
    return []
  }
}

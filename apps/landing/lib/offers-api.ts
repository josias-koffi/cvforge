import type { PublicCreditOffer } from "@cvforge/types"

const DEFAULT_API_URL = "http://localhost:3333"

/** Seconds a rendered pricing section is reused before asking the API again. */
export const OFFERS_REVALIDATE_SECONDS = 300

/**
 * Server-side base URL of the API, read at request time. On Dokploy this is
 * the public API host, never a bare service name shared across environments.
 */
export function apiUrl(env: NodeJS.ProcessEnv = process.env) {
  const base =
    env.API_INTERNAL_URL?.trim() ||
    env.NEXT_PUBLIC_API_URL?.trim() ||
    DEFAULT_API_URL

  return base.replace(/\/+$/, "")
}

/**
 * The public catalogue, or `null` when the API cannot be reached: the landing
 * then shows no price at all rather than a stale or invented one.
 */
export async function fetchPublicOffers(
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch
): Promise<PublicCreditOffer[] | null> {
  try {
    const response = await fetcher(`${apiUrl(env)}/public/credit-offers`, {
      next: { revalidate: OFFERS_REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as { offers?: PublicCreditOffer[] }

    return Array.isArray(payload.offers) ? payload.offers : null
  } catch {
    return null
  }
}

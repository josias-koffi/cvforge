import type { LegalDocumentSlug, PublicLegalDocument } from "@cvforge/types"

import { apiUrl } from "@/lib/offers-api"

/** Seconds a rendered legal page is reused before asking the API again. */
export const LEGAL_REVALIDATE_SECONDS = 300

/**
 * The published document, or `null` when the API cannot serve it. A legal page
 * must not invent or half-show a contract: the caller answers 404 rather than
 * rendering an empty one.
 */
export async function fetchLegalDocument(
  slug: LegalDocumentSlug,
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch
): Promise<PublicLegalDocument | null> {
  try {
    const response = await fetcher(`${apiUrl(env)}/public/legal/${slug}`, {
      next: { revalidate: LEGAL_REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as { document?: PublicLegalDocument }

    return payload.document ?? null
  } catch {
    return null
  }
}

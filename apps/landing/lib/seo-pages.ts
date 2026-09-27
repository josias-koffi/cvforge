import { apiUrl } from "@/lib/offers-api"

/**
 * What the landing's generated pages share: the job × department pages
 * (US-138) and the company pages (US-140).
 *
 * Their data changes once a month at most: a page rendered today is reused
 * for a day before the API is asked again.
 */
export const SEO_PAGE_REVALIDATE_SECONDS = 86_400

/** "Développeur / Développeuse web" → "developpeur-developpeuse-web". */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * "comptable-m1203": the words are for readers and may change with a label,
 * the code closing the segment is what the page is read from.
 */
export function slugSegment(label: string, code: string) {
  const words = slugify(label)
  const tail = code.toLowerCase()

  return words ? `${words}-${tail}` : tail
}

/**
 * One public API read, revalidated daily, or null — for a missing page as
 * for an API that cannot answer. Either way the caller has nothing to show.
 */
export async function fetchSeoPageData<T>(
  path: string,
  env: NodeJS.ProcessEnv = process.env,
  fetcher: typeof fetch = fetch
): Promise<T | null> {
  try {
    const response = await fetcher(`${apiUrl(env)}${path}`, {
      next: { revalidate: SEO_PAGE_REVALIDATE_SECONDS },
    })

    return response.ok ? ((await response.json()) as T) : null
  } catch {
    return null
  }
}

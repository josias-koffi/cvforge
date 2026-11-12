const DEFAULT_SITE_URL = "http://localhost:3101"

/** Public origin of the landing, used for canonical URLs, sitemap and OG images. */
export function siteUrl(env: NodeJS.ProcessEnv = process.env) {
  return (env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(
    /\/+$/,
    ""
  )
}

/**
 * Whether search engines may index this deployment: production only. Read at
 * request time (DEPLOY_ENV comes from the manifest's `${env}`), since one
 * image serves every environment. Staging, previews and local dev answer
 * noindex, so they never compete with the real site in Google.
 */
export function isIndexable(
  env: Record<string, string | undefined> = process.env
) {
  return env.DEPLOY_ENV?.trim() === "production"
}

/** The header that keeps a non-production deployment out of search results. */
export const NOINDEX_HEADER = ["X-Robots-Tag", "noindex, nofollow"] as const

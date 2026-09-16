const DEFAULT_SITE_URL = "http://localhost:3101"

/** Public origin of the landing, used for canonical URLs, sitemap and OG images. */
export function siteUrl(env: NodeJS.ProcessEnv = process.env) {
  return (env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL).replace(
    /\/+$/,
    ""
  )
}

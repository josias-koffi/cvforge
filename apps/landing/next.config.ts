import path from "node:path"
import type { NextConfig } from "next"

export function resolveNextDistDir(value: string | undefined) {
  const trimmed = value?.trim()

  if (!trimmed || path.isAbsolute(trimmed)) {
    return undefined
  }

  const normalized = trimmed.replaceAll("\\", "/")

  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    return undefined
  }

  return normalized
}

const nextDistDir = resolveNextDistDir(process.env.NEXT_DIST_DIR)

/**
 * Each legal document has one address per language. Kept in step with
 * `legalSlugs` in lib/legal.ts, which a test enforces — this config cannot
 * import it, Next loads it outside the app's path aliases.
 */
const LEGAL_SLUGS: [fr: string, en: string][] = [
  ["cgu", "terms"],
  ["cgv", "sales-terms"],
  ["mentions-legales", "legal-notice"],
  ["confidentialite", "privacy"],
]

export function legalRedirects() {
  return LEGAL_SLUGS.flatMap(([fr, en]) => [
    { source: `/fr/legal/${en}`, destination: `/fr/legal/${fr}`, permanent: true },
    { source: `/en/legal/${fr}`, destination: `/en/legal/${en}`, permanent: true },
  ])
}

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  transpilePackages: ["@cvforge/types"],
  ...(nextDistDir ? { distDir: nextDistDir } : {}),
  // The story page has one route; each locale exposes it under its own slug.
  // The legal documents work the same way, so a link shared in one language
  // lands on the reader's own wording rather than on a 404.
  async redirects() {
    return [
      { source: "/fr/story", destination: "/fr/histoire", permanent: true },
      { source: "/en/histoire", destination: "/en/story", permanent: true },
      // Same arrangement for the ATS check: the route folder carries the
      // English slug, the French address is rewritten onto it.
      { source: "/fr/ats-check", destination: "/fr/analyse-ats", permanent: true },
      { source: "/en/analyse-ats", destination: "/en/ats-check", permanent: true },
      // And for the free tools hub.
      { source: "/fr/tools", destination: "/fr/outils", permanent: true },
      { source: "/en/outils", destination: "/en/tools", permanent: true },
      // And for the CV ↔ offer comparator.
      { source: "/fr/cv-job-match", destination: "/fr/comparateur-cv-offre", permanent: true },
      { source: "/en/comparateur-cv-offre", destination: "/en/cv-job-match", permanent: true },
      // And for the job market tool.
      { source: "/fr/job-market", destination: "/fr/metier-recrute", permanent: true },
      { source: "/en/metier-recrute", destination: "/en/job-market", permanent: true },
      ...legalRedirects(),
    ]
  },
  async rewrites() {
    return [
      { source: "/fr/histoire", destination: "/fr/story" },
      { source: "/fr/analyse-ats", destination: "/fr/ats-check" },
      { source: "/fr/outils", destination: "/fr/tools" },
      { source: "/fr/comparateur-cv-offre", destination: "/fr/cv-job-match" },
      { source: "/fr/metier-recrute", destination: "/fr/job-market" },
    ]
  },
}

export default nextConfig

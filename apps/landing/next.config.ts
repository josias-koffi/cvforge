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

/**
 * The feature pages (US-142), [fr, en], the route folder carrying the English
 * slug. Kept in step with `featureSlugs` in lib/i18n.ts, which a test
 * enforces, for the same reason as the legal slugs above.
 */
const FEATURE_SLUGS: [fr: string, en: string][] = [
  ["offres-du-jour", "daily-job-offers"],
  ["cv-lettre-sur-mesure", "tailored-resume-cover-letter"],
  ["simulation-entretien", "mock-interview"],
  ["entreprises-qui-recrutent", "companies-hiring"],
]

export function featureRedirects() {
  return FEATURE_SLUGS.flatMap(([fr, en]) => [
    { source: `/fr/${en}`, destination: `/fr/${fr}`, permanent: true },
    { source: `/en/${fr}`, destination: `/en/${en}`, permanent: true },
  ])
}

/** The page and what hangs below it, such as its share card. */
export function featureRewrites() {
  return FEATURE_SLUGS.flatMap(([fr, en]) => [
    { source: `/fr/${fr}`, destination: `/fr/${en}` },
    { source: `/fr/${fr}/:path+`, destination: `/fr/${en}/:path+` },
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
      // Its job × department pages (US-138), under the same slugs.
      { source: "/fr/job-market/:path+", destination: "/fr/metier-recrute/:path+", permanent: true },
      { source: "/en/metier-recrute/:path+", destination: "/en/job-market/:path+", permanent: true },
      // And for the employer check (US-139).
      { source: "/fr/employer-check", destination: "/fr/verifier-employeur", permanent: true },
      { source: "/en/verifier-employeur", destination: "/en/employer-check", permanent: true },
      // Its company pages (US-140), under the same slugs.
      { source: "/fr/employer-check/:path+", destination: "/fr/verifier-employeur/:path+", permanent: true },
      { source: "/en/verifier-employeur/:path+", destination: "/en/employer-check/:path+", permanent: true },
      // And for the likely interview questions (US-141).
      { source: "/fr/interview-questions", destination: "/fr/questions-entretien", permanent: true },
      { source: "/en/questions-entretien", destination: "/en/interview-questions", permanent: true },
      ...featureRedirects(),
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
      { source: "/fr/metier-recrute/:path+", destination: "/fr/job-market/:path+" },
      { source: "/fr/verifier-employeur", destination: "/fr/employer-check" },
      { source: "/fr/verifier-employeur/:path+", destination: "/fr/employer-check/:path+" },
      { source: "/fr/questions-entretien", destination: "/fr/interview-questions" },
      ...featureRewrites(),
    ]
  },
}

export default nextConfig

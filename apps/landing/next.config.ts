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

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  transpilePackages: ["@cvforge/types"],
  ...(nextDistDir ? { distDir: nextDistDir } : {}),
  // The story page has one route; each locale exposes it under its own slug.
  async redirects() {
    return [
      { source: "/fr/story", destination: "/fr/histoire", permanent: true },
      { source: "/en/histoire", destination: "/en/story", permanent: true },
    ]
  },
  async rewrites() {
    return [{ source: "/fr/histoire", destination: "/fr/story" }]
  },
}

export default nextConfig

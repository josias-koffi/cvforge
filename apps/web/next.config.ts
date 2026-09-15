import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  transpilePackages: ["@cvforge/document-renderer", "@cvforge/types"],
  experimental: {
    // CV imports (PDF/DOCX up to 5 MB) are uploaded through a server action.
    serverActions: { bodySizeLimit: "6mb" },
  },
}

export default nextConfig

import type { NextConfig } from "next"


/**
 * Headers every response carries. No CSP yet: Next's inline bootstrap scripts
 * need nonces, to be rolled out in report-only mode first.
 */
export function securityHeaders() {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  ]
}

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  transpilePackages: ["@cvforge/document-renderer", "@cvforge/types"],
  experimental: {
    // CV imports (PDF/DOCX up to 5 MB) are uploaded through a server action.
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }]
  },
  async redirects() {
    // Former route name, kept so existing links and bookmarks still resolve.
    return [{ source: "/offers/:path*", destination: "/candidatures/:path*", permanent: true }]
  },
}

export default nextConfig

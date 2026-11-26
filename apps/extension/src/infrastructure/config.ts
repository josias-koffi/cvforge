/** Production API unless the build sets `WXT_JOBSPARK_API_URL` (preprod, local). */
const PRODUCTION_API_URL = "https://jobspark-api.koklo.dev";

export function apiEndpoints(
  configured = import.meta.env.WXT_JOBSPARK_API_URL,
) {
  const origin = new URL(configured || PRODUCTION_API_URL).origin;
  return { host: new URL(origin).host, mcpUrl: `${origin}/mcp`, origin };
}

/**
 * The visitor's address, forwarded deliberately: the API rate-limits and
 * counts visitors per IP, and without this every visitor would arrive as this
 * server and share a single bucket.
 *
 * `CLIENT_IP_HEADER` names the header the edge guarantees, when there is one.
 * Behind Cloudflare that is `cf-connecting-ip`: the first hop of
 * `X-Forwarded-For` is then either Cloudflare's own node, shared by many
 * visitors, or a value the visitor wrote themselves (US-132, ADR-022).
 *
 * In production this server reaches the API through its public host, and
 * Traefik overwrites `X-Forwarded-For` on the way in. The address is therefore
 * also relayed in the API's own header, signed with `LANDING_PROXY_SECRET`,
 * which the API believes only when the secret matches.
 */
export function forwardedFor(
  request: Request,
  env: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const trustedHeader = env.CLIENT_IP_HEADER?.trim().toLowerCase()
  const trusted = trustedHeader
    ? request.headers.get(trustedHeader)?.trim()
    : undefined
  const forwarded = request.headers.get("x-forwarded-for")
  const real = request.headers.get("x-real-ip")
  const client = trusted || forwarded?.split(",")[0]?.trim() || real?.trim()

  if (!client) return {}

  const secret = env.LANDING_PROXY_SECRET?.trim()

  return {
    "x-forwarded-for": client,
    "x-real-ip": client,
    ...(secret
      ? { "x-cvforge-client-ip": client, "x-cvforge-proxy-secret": secret }
      : {}),
  }
}

import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

const UNKNOWN_IP = "unknown";

/** The visitor's address, as relayed by the landing's server (US-132). */
export const RELAYED_CLIENT_IP_HEADER = "x-cvforge-client-ip";
/** Proves the relay is the landing: only it holds `LANDING_PROXY_SECRET`. */
export const PROXY_SECRET_HEADER = "x-cvforge-proxy-secret";

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
};

function header(request: RequestLike, name: string) {
  const value = request.headers[name];

  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
}

/** Constant-time, so the secret cannot be guessed one byte at a time. */
function sameSecret(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);

  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Who the caller is, for the per-IP limits and the visitor hash.
 *
 * In production the landing reaches the API through its public host, so
 * Traefik overwrites `X-Forwarded-For` with the landing's own address and
 * every visitor would share one counter. The landing therefore relays the
 * visitor's address in its own header, signed with a shared secret; it is
 * believed only when that secret matches. Without a secret configured, the
 * header is ignored altogether (ADR-022).
 *
 * Otherwise, the first hop of `X-Forwarded-For` is the client and the rest are
 * the proxies it passed through. Express only populates `request.ip` from that
 * header when `trust proxy` is set, so both are consulted.
 *
 * An unidentifiable caller shares one bucket rather than bypassing the limit:
 * the global budget still bounds the damage either way.
 */
export function clientIp(
  request: RequestLike,
  proxySecret: string | undefined = process.env.LANDING_PROXY_SECRET,
): string {
  const expected = proxySecret?.trim();
  const given = header(request, PROXY_SECRET_HEADER);
  const relayed = header(request, RELAYED_CLIENT_IP_HEADER);

  // `isIP` too: the value becomes a counter key and a hash input, so even a
  // trusted relay only ever contributes an address.
  if (
    expected &&
    given &&
    relayed &&
    isIP(relayed) &&
    sameSecret(given, expected)
  ) {
    return relayed;
  }

  const firstHop = header(request, "x-forwarded-for")?.split(",")[0]?.trim();

  return firstHop || request.ip || request.socket?.remoteAddress || UNKNOWN_IP;
}

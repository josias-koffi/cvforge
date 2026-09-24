import { createHash, randomBytes } from "node:crypto";

/**
 * The salt of every stored IP hash, so they are not a rainbow table of the
 * IPv4 space.
 *
 * A per-process random salt when unset: hashes stop correlating across
 * restarts, which weakens forensics but never leaks an address. Set
 * `ATS_IP_HASH_SECRET` in production to keep them comparable.
 */
export function resolveIpHashSecret(env: NodeJS.ProcessEnv = process.env) {
  return env.ATS_IP_HASH_SECRET?.trim() || randomBytes(32).toString("hex");
}

/** sha256(ip + secret). The raw address is never what gets written. */
export function hashIp(ip: string, secret: string) {
  return createHash("sha256").update(`${ip}${secret}`).digest("hex");
}

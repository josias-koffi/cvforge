import { lookup as dnsLookup } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

/** The target is not a public web address, or a redirect led somewhere that is not. */
export class BlockedUrlError extends Error {}
/** The page could not be read: network failure, timeout, too large, too many redirects. */
export class FetchFailedError extends Error {}

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_REDIRECTS = 5;
const ALLOWED_PORTS = new Set(["", "80", "443"]);

const PRIVATE_RANGES = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  PRIVATE_RANGES.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["64:ff9b::", 96],
  ["2001:db8::", 32],
] as const) {
  PRIVATE_RANGES.addSubnet(network, prefix, "ipv6");
}

/** True for loopback, private, link-local, multicast and other non-public addresses. */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);

  if (family === 0) {
    return true;
  }

  // ::ffff:10.0.0.1 is the IPv4 address in disguise.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);

  if (mapped) {
    return PRIVATE_RANGES.check(mapped[1]!, "ipv4");
  }

  return PRIVATE_RANGES.check(address, family === 4 ? "ipv4" : "ipv6");
}

/**
 * `dns.lookup` that refuses private answers. Node connects to the address this
 * returns, so the check cannot be sidestepped by a name that resolves one way
 * for the check and another for the connection (DNS rebinding).
 */
const guardedLookup: typeof dnsLookup = ((hostname: string, options: unknown, callback: unknown) => {
  const cb = (typeof options === "function" ? options : callback) as (...args: unknown[]) => void;
  const opts = typeof options === "function" ? {} : (options as object);

  dnsLookup(hostname, { ...opts, all: true }, (error, addresses) => {
    if (error) {
      cb(error);
      return;
    }

    const list = addresses as Array<{ address: string; family: number }>;

    if (list.length === 0 || list.some((entry) => isPrivateAddress(entry.address))) {
      cb(new BlockedUrlError("The address is not public."));
      return;
    }

    if ((opts as { all?: boolean }).all) {
      cb(null, list);
      return;
    }

    cb(null, list[0]!.address, list[0]!.family);
  });
}) as typeof dnsLookup;

export type SafeFetchOptions = {
  accept?: string;
  maxBytes?: number;
  maxRedirects?: number;
  timeoutMs?: number;
  userAgent?: string;
};

export type SafeFetchResult = { status: number; text: string };

function assertPublicUrl(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedUrlError("Only http and https are allowed.");
  }

  if (url.username || url.password) {
    throw new BlockedUrlError("Credentials in the URL are not allowed.");
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    throw new BlockedUrlError("Only the standard web ports are allowed.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");

  // An IP literal never goes through the lookup, so it is judged here.
  if (isIP(host) !== 0 && isPrivateAddress(host)) {
    throw new BlockedUrlError("The address is not public.");
  }
}

function decoderFor(encoding: string | undefined) {
  switch ((encoding ?? "").toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return createGunzip();
    case "deflate":
      return createInflate();
    case "br":
      return createBrotliDecompress();
    default:
      return null;
  }
}

function once(url: URL, options: Required<Omit<SafeFetchOptions, "maxRedirects">>) {
  return new Promise<{ status: number; location: string | null; text: string }>(
    (resolve, reject) => {
      const send = url.protocol === "https:" ? httpsRequest : httpRequest;
      const req = send(
        url,
        {
          headers: {
            accept: options.accept,
            "accept-encoding": "gzip, deflate, br",
            "user-agent": options.userAgent,
          },
          lookup: guardedLookup,
          method: "GET",
          timeout: options.timeoutMs,
        },
        (response) => {
          const status = response.statusCode ?? 0;
          const location = response.headers.location ?? null;

          if (status >= 300 && status < 400) {
            response.resume();
            resolve({ location, status, text: "" });
            return;
          }

          const decoder = decoderFor(response.headers["content-encoding"]);
          const body = decoder ? response.pipe(decoder) : response;
          const chunks: Buffer[] = [];
          let size = 0;

          body.on("data", (chunk: Buffer) => {
            size += chunk.length;

            if (size > options.maxBytes) {
              req.destroy(new FetchFailedError("The page is too large."));
              return;
            }

            chunks.push(chunk);
          });
          body.on("end", () =>
            resolve({ location: null, status, text: Buffer.concat(chunks).toString("utf8") }),
          );
          body.on("error", reject);
          response.on("error", reject);
        },
      );

      req.on("timeout", () => req.destroy(new FetchFailedError("The request timed out.")));
      req.on("error", (error) =>
        reject(
          error instanceof BlockedUrlError || error instanceof FetchFailedError
            ? error
            : new FetchFailedError(error.message),
        ),
      );
      req.end();
    },
  );
}

/**
 * Reads a page a user pointed us at without letting the server be turned into
 * a proxy for the internal network: public addresses only, standard ports,
 * every redirect re-checked, a bounded size and time.
 */
export async function fetchPublicPage(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const resolved: Required<Omit<SafeFetchOptions, "maxRedirects">> = {
    accept: options.accept ?? "text/html,application/xhtml+xml",
    maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    userAgent: options.userAgent ?? "Mozilla/5.0 (compatible; JobSparkBot/1.0)",
  };
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  let current: URL;

  try {
    current = new URL(rawUrl);
  } catch {
    throw new BlockedUrlError("The URL is invalid.");
  }

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    assertPublicUrl(current);
    const result = await once(current, resolved);

    if (result.location) {
      try {
        current = new URL(result.location, current);
      } catch {
        throw new FetchFailedError("The redirect target is invalid.");
      }
      continue;
    }

    return { status: result.status, text: result.text };
  }

  throw new FetchFailedError("Too many redirects.");
}

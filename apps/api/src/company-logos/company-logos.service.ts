import { createHash } from "node:crypto";
import { Logger } from "@nestjs/common";
import type { RedisClient } from "../shared/redis/redis.module";
import { isAllowedLogoUrl } from "./logo-sources";

type FetchLike = typeof globalThis.fetch;

export interface CompanyLogo {
  contentType: string;
  body: Buffer;
}

/** A logo changes with a rebranding: a month is plenty, and bounds the cache. */
const HIT_TTL_SECONDS = 30 * 24 * 3600;
/** A missing logo is asked again the next day, not on every card shown. */
const MISS_TTL_SECONDS = 24 * 3600;
/** France Travail's are about 70 KB, Commons thumbnails under 10 KB. */
const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 8_000;
/** Raster only: an SVG can carry script, whoever serves it. */
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
/** Wikimedia asks for a User-Agent that says who calls. */
const USER_AGENT = "CVSpark/1.0 (https://cvspark.fr)";
const KEY_PREFIX = "company-logo:v1:";

/**
 * Company logos, fetched from the allowed sources and kept in Redis
 * (ADR-025). A page asks for each logo on every card it shows: without the
 * cache, a list of 24 companies would be 24 calls to France Travail.
 *
 * Without Redis — unset, or down — every logo is fetched each time: slower,
 * never broken.
 */
export class CompanyLogosService {
  private readonly logger = new Logger(CompanyLogosService.name);

  constructor(
    private readonly redis: RedisClient | null,
    private readonly fetchImpl: FetchLike = globalThis.fetch,
  ) {}

  /** The logo behind `src`, or `null` when there is none worth showing. */
  async get(src: string): Promise<CompanyLogo | null> {
    if (!isAllowedLogoUrl(src)) return null;

    const key = KEY_PREFIX + createHash("sha256").update(src).digest("hex");
    const cached = await this.read(key);
    if (cached !== undefined) return cached;

    const logo = await this.fetchLogo(src);
    await this.write(key, logo);

    return logo;
  }

  private async fetchLogo(src: string): Promise<CompanyLogo | null> {
    try {
      const response = await this.fetchImpl(src, {
        headers: {
          accept: [...IMAGE_TYPES].join(","),
          "user-agent": USER_AGENT,
        },
        // A redirect could lead anywhere: the allowed URLs never need one.
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) return null;

      const contentType = (response.headers.get("content-type") ?? "")
        .split(";")[0]!
        .trim()
        .toLowerCase();
      if (!IMAGE_TYPES.has(contentType)) return null;

      const declared = Number(response.headers.get("content-length"));
      if (declared > MAX_BYTES) return null;

      const body = Buffer.from(await response.arrayBuffer());
      if (body.length === 0 || body.length > MAX_BYTES) return null;

      return { body, contentType };
    } catch (error) {
      this.logger.warn(`Logo ${new URL(src).host} failed: ${String(error)}`);
      return null;
    }
  }

  /**
   * `undefined` when the cache has nothing to say (absent, or unreachable),
   * `null` for a logo known to be missing.
   */
  private async read(key: string): Promise<CompanyLogo | null | undefined> {
    if (!this.redis) return undefined;

    try {
      const stored = await this.redis.getBuffer(key);
      return stored ? decode(stored) : undefined;
    } catch {
      return undefined;
    }
  }

  private async write(key: string, logo: CompanyLogo | null) {
    if (!this.redis) return;

    try {
      await this.redis.set(
        key,
        encode(logo),
        "EX",
        logo ? HIT_TTL_SECONDS : MISS_TTL_SECONDS,
      );
    } catch {
      // A cache that cannot be written is only a slower page.
    }
  }
}

/** The type, a zero byte, then the image; a lone zero byte for "no logo". */
export function encode(logo: CompanyLogo | null): Buffer {
  if (!logo) return Buffer.from([0]);

  return Buffer.concat([
    Buffer.from(logo.contentType, "ascii"),
    Buffer.from([0]),
    logo.body,
  ]);
}

export function decode(stored: Buffer): CompanyLogo | null | undefined {
  const separator = stored.indexOf(0);
  if (separator < 0) return undefined;
  if (separator === 0) return null;

  const contentType = stored.subarray(0, separator).toString("ascii");
  if (!IMAGE_TYPES.has(contentType)) return undefined;

  return { body: stored.subarray(separator + 1), contentType };
}

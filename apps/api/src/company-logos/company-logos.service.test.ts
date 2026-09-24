import { describe, expect, it } from "vitest";
import type { RedisClient } from "../shared/redis/redis.module";
import { CompanyLogosService, decode, encode } from "./company-logos.service";

const LOGO_URL =
  "https://api.francetravail.fr/exp-rechercheoffre/v1/logo-entreprise/MV3d7KZ8";
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

function fakeRedis(options: { down?: boolean } = {}) {
  const store = new Map<string, { value: Buffer; ttl: number }>();
  const redis = {
    getBuffer: async (key: string) => {
      if (options.down) throw new Error("Connection is closed.");
      return store.get(key)?.value ?? null;
    },
    set: async (key: string, value: Buffer, _ex: "EX", ttl: number) => {
      if (options.down) throw new Error("Connection is closed.");
      store.set(key, { ttl, value });
      return "OK";
    },
  } as unknown as RedisClient;

  return { redis, store };
}

function fakeFetch(response: () => Response) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push({ init, url });
    return response();
  }) as typeof fetch;

  return { calls, fetchImpl };
}

const png = () =>
  new Response(PNG, { headers: { "content-type": "image/png" }, status: 200 });

describe("CompanyLogosService", () => {
  it("fetches a logo once, then serves it from Redis for a month", async () => {
    const { redis, store } = fakeRedis();
    const { calls, fetchImpl } = fakeFetch(png);
    const service = new CompanyLogosService(redis, fetchImpl);

    expect(await service.get(LOGO_URL)).toEqual({
      body: PNG,
      contentType: "image/png",
    });
    expect(await service.get(LOGO_URL)).toEqual({
      body: PNG,
      contentType: "image/png",
    });

    expect(calls).toHaveLength(1);
    // No redirect followed: the allowed URLs never need one.
    expect(calls[0]?.init?.redirect).toBe("error");
    expect([...store.values()][0]?.ttl).toBe(30 * 24 * 3600);
  });

  it("remembers a missing logo for a day, not a month", async () => {
    const { redis, store } = fakeRedis();
    const { calls, fetchImpl } = fakeFetch(
      () => new Response("", { status: 404 }),
    );
    const service = new CompanyLogosService(redis, fetchImpl);

    expect(await service.get(LOGO_URL)).toBeNull();
    expect(await service.get(LOGO_URL)).toBeNull();

    expect(calls).toHaveLength(1);
    expect([...store.values()][0]?.ttl).toBe(24 * 3600);
  });

  it("works without Redis, or with Redis down: slower, never broken", async () => {
    for (const redis of [null, fakeRedis({ down: true }).redis]) {
      const { calls, fetchImpl } = fakeFetch(png);
      const service = new CompanyLogosService(redis, fetchImpl);

      expect(await service.get(LOGO_URL)).not.toBeNull();
      expect(await service.get(LOGO_URL)).not.toBeNull();
      expect(calls).toHaveLength(2);
    }
  });

  it("fetches nothing outside the allowed sources", async () => {
    const { calls, fetchImpl } = fakeFetch(png);
    const service = new CompanyLogosService(null, fetchImpl);

    expect(
      await service.get("http://169.254.169.254/latest/meta-data"),
    ).toBeNull();
    expect(calls).toEqual([]);
  });

  it("refuses an SVG, a page, an empty body and an oversized image", async () => {
    const answers = [
      new Response("<svg onload=alert(1)/>", {
        headers: { "content-type": "image/svg+xml" },
      }),
      new Response("<html></html>", {
        headers: { "content-type": "text/html" },
      }),
      new Response(new Uint8Array(0), {
        headers: { "content-type": "image/png" },
      }),
      new Response(new Uint8Array(600 * 1024), {
        headers: { "content-type": "image/png" },
      }),
    ];

    for (const answer of answers) {
      const service = new CompanyLogosService(
        null,
        fakeFetch(() => answer).fetchImpl,
      );
      expect(await service.get(LOGO_URL)).toBeNull();
    }
  });
});

describe("encode / decode", () => {
  it("round-trips a logo and the absence of one", () => {
    const logo = { body: PNG, contentType: "image/png" };

    expect(decode(encode(logo))).toEqual(logo);
    expect(decode(encode(null))).toBeNull();
    expect(decode(Buffer.from("garbage"))).toBeUndefined();
  });
});

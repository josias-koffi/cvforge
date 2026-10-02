import { describe, expect, it, vi } from "vitest";
import { FtHttpClient } from "../../france-travail/ft-http.client";
import { resolveFtConfig } from "../../france-travail/ft.config";
import { SourceRateLimiter } from "../../shared/rate-limit/source-rate-limiter";
import {
  FRANCE_TRAVAIL_SEARCH_CEILING,
  FranceTravailStreamReader,
  readTotal,
  toSecondIso,
} from "./france-travail.stream";

const CREDENTIALS = {
  FRANCE_TRAVAIL_CLIENT_ID: "id",
  FRANCE_TRAVAIL_CLIENT_SECRET: "secret",
};
const FROM = new Date("2026-09-28T09:00:00Z");
const TO = new Date("2026-09-28T10:00:00Z");

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...headers },
    status,
  });
}

function instantLimiter() {
  let now = 0;

  return new SourceRateLimiter({
    now: () => now,
    requestsPerSecond: 1000,
    sleep: async (delayMs) => {
      now += delayMs;
    },
  });
}

function makeOffer(id: string, dateCreation: string) {
  return {
    dateCreation,
    entreprise: { nom: "ACME" },
    id,
    intitule: `Offre ${id}`,
    lieuTravail: { libelle: "44 - NANTES" },
    typeContrat: "CDI",
  };
}

/** `count` offers spread evenly over the hour, one every few seconds. */
function offersOverTheHour(count: number) {
  const step = (TO.getTime() - FROM.getTime()) / count;

  return Array.from({ length: count }, (_, index) =>
    makeOffer(
      `O${index}`,
      new Date(FROM.getTime() + Math.floor(index * step)).toISOString(),
    ),
  );
}

/**
 * A France Travail that behaves like the real one: inclusive creation dates
 * read to the second, 150 per page, `Content-Range` with the full total, and
 * a 400 past the 1 150th result.
 */
function fakeFranceTravail(offers: ReturnType<typeof makeOffer>[]) {
  const searches: URL[] = [];
  const fetchImpl = vi.fn(async (input: string | URL) => {
    const url = new URL(String(input));

    if (url.pathname.includes("access_token")) {
      return jsonResponse({ access_token: "token", expires_in: 1499 });
    }

    searches.push(url);
    const min = Date.parse(url.searchParams.get("minCreationDate") ?? "");
    const max = Date.parse(url.searchParams.get("maxCreationDate") ?? "");
    const [start, end] = (url.searchParams.get("range") ?? "0-149")
      .split("-")
      .map(Number) as [number, number];

    if (start >= FRANCE_TRAVAIL_SEARCH_CEILING) {
      return jsonResponse({ message: "range invalide" }, 400);
    }

    const inSlice = offers.filter((offer) => {
      const second = Math.floor(Date.parse(offer.dateCreation) / 1000) * 1000;
      return second >= min && second <= max;
    });

    if (inSlice.length === 0) return new Response(null, { status: 204 });

    const page = inSlice.slice(start, end + 1);

    return jsonResponse({ resultats: page }, 206, {
      "content-range": `offres ${start}-${start + page.length - 1}/${inSlice.length}`,
    });
  });

  return { fetchImpl, searches };
}

function createReader(fetchImpl: ReturnType<typeof vi.fn>) {
  return new FranceTravailStreamReader(
    new FtHttpClient(
      resolveFtConfig(CREDENTIALS),
      fetchImpl as unknown as typeof globalThis.fetch,
      () => 0,
      undefined,
      instantLimiter,
    ),
  );
}

describe("FranceTravailStreamReader", () => {
  it("cuts a slice of 3 000 offers in two until each half fits, and loses none", async () => {
    const offers = offersOverTheHour(3_000);
    const { fetchImpl, searches } = fakeFranceTravail(offers);

    const result = await createReader(fetchImpl).read(FROM, TO);

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect(new Set(result.listings.map((listing) => listing.externalId))).toEqual(
      new Set(offers.map((offer) => offer.id)),
    );
    expect(result.listings).toHaveLength(3_000);
    // Never asked past the ceiling: the 400 would have failed the slice.
    expect(
      searches.every(
        (url) =>
          Number(url.searchParams.get("range")?.split("-")[0]) <
          FRANCE_TRAVAIL_SEARCH_CEILING,
      ),
    ).toBe(true);
    expect(result.calls).toBe(searches.length);
  });

  it("reads France entière, without keyword nor department, to the second", async () => {
    const { fetchImpl, searches } = fakeFranceTravail(offersOverTheHour(10));

    await createReader(fetchImpl).read(
      new Date("2026-09-28T09:00:00.456Z"),
      TO,
    );

    const params = Object.fromEntries(searches[0]?.searchParams ?? []);
    expect(params).toEqual({
      maxCreationDate: "2026-09-28T10:00:00Z",
      minCreationDate: "2026-09-28T09:00:00Z",
      range: "0-149",
    });
  });

  it("pages through a slice under the ceiling without cutting it", async () => {
    const { fetchImpl, searches } = fakeFranceTravail(offersOverTheHour(400));

    const result = await createReader(fetchImpl).read(FROM, TO);

    expect(result.kind === "ok" && result.listings).toHaveLength(400);
    expect(searches.map((url) => url.searchParams.get("range"))).toEqual([
      "0-149",
      "150-299",
      "300-449",
    ]);
  });

  it("answers an empty slice with no offer and one call", async () => {
    const { fetchImpl } = fakeFranceTravail([]);

    expect(await createReader(fetchImpl).read(FROM, TO)).toEqual({
      calls: 1,
      kind: "ok",
      listings: [],
    });
  });

  it("fails the whole slice on a 429, with the pause the API asked for", async () => {
    const fetchImpl = vi.fn(async (input: string | URL) =>
      String(input).includes("access_token")
        ? jsonResponse({ access_token: "token", expires_in: 1499 })
        : new Response("slow down", {
            headers: { "retry-after": "30" },
            status: 429,
          }),
    );

    const result = await createReader(fetchImpl).read(FROM, TO);

    expect(result).toMatchObject({
      kind: "failed",
      retryAfterMs: 30_000,
      throttled: true,
    });
  });
});

describe("readTotal", () => {
  it("reads the total of a Content-Range, and nothing else", () => {
    expect(readTotal("offres 0-149/3000")).toBe(3000);
    expect(readTotal(null)).toBeNull();
    expect(readTotal("offres 0-149/*")).toBeNull();
  });
});

describe("toSecondIso", () => {
  it("drops the milliseconds the API does not accept", () => {
    expect(toSecondIso(new Date("2026-09-28T09:32:33.999Z"))).toBe(
      "2026-09-28T09:32:33Z",
    );
  });
});

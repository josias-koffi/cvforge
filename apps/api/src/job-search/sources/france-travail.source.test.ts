import { describe, expect, it, vi } from "vitest";
import type { JobSourceQuery } from "../job-search.types";
import { FtHttpClient } from "../../france-travail/ft-http.client";
import { resolveFtConfig } from "../../france-travail/ft.config";
import { SourceRateLimiter } from "../../shared/rate-limit/source-rate-limiter";
import { FranceTravailSource } from "./france-travail.source";

const QUERY: JobSourceQuery = {
  contractTypes: ["cdi"],
  department: "44",
  experienceLevel: null,
  keywords: "Développeur",
  romeCodes: [],
  nafDivisions: [],
  publishedSinceDays: 1,
};

function makeOffer(id: string) {
  return {
    dateCreation: "2026-09-20T08:00:00.000Z",
    entreprise: { nom: "ACME" },
    id,
    intitule: `Développeur ${id}`,
    lieuTravail: { libelle: "44 - NANTES" },
    typeContrat: "CDI",
  };
}

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...headers },
    status,
  })
}

/** A limiter that never waits, so the tests assert calls and not timing. */
function instantLimiter() {
  let now = 0

  return new SourceRateLimiter({
    now: () => now,
    requestsPerSecond: 1000,
    sleep: async (delayMs) => {
      now += delayMs
    },
  })
}

function createSource(
  fetchImpl: ReturnType<typeof vi.fn>,
  env: NodeJS.ProcessEnv = {
    FRANCE_TRAVAIL_CLIENT_ID: "id",
    FRANCE_TRAVAIL_CLIENT_SECRET: "secret",
  },
) {
  const fetchLike = fetchImpl as unknown as typeof globalThis.fetch;
  const config = resolveFtConfig(env);

  return new FranceTravailSource(
    new FtHttpClient(config, fetchLike, () => 0, undefined, instantLimiter),
  );
}

function tokenResponse() {
  return jsonResponse({ access_token: "token-1", expires_in: 1499 });
}

describe("FranceTravailSource", () => {
  it("does nothing at all without credentials", async () => {
    const fetchImpl = vi.fn();
    const source = createSource(fetchImpl, {});

    expect(await source.search(QUERY)).toEqual([]);
    expect(await source.isStillOpen("1")).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("authenticates once and reuses the token across calls", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockImplementation(async () => jsonResponse({ resultats: [makeOffer("1")] }));
    const source = createSource(fetchImpl);

    await source.search(QUERY);
    await source.search(QUERY);

    const tokenCalls = fetchImpl.mock.calls.filter(([url]) =>
      String(url).includes("access_token"),
    );
    expect(tokenCalls).toHaveLength(1);
    expect(String(tokenCalls[0]?.[1]?.body)).toContain("grant_type=client_credentials");
  });

  it("still caches a token whose lifetime the server left out", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1" }))
      .mockImplementation(async () => jsonResponse({ resultats: [] }));
    const source = createSource(fetchImpl);

    await source.search(QUERY);
    await source.search(QUERY);

    // Without a documented fallback the token expires on arrival, and every
    // call re-authenticates.
    expect(
      fetchImpl.mock.calls.filter(([url]) => String(url).includes("access_token")),
    ).toHaveLength(1);
  });

  it("sends the translated search parameters", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockImplementation(async () => jsonResponse({ resultats: [] }));
    const source = createSource(fetchImpl);

    await source.search(QUERY);

    const url = new URL(String(fetchImpl.mock.calls[1]?.[0]));
    expect(url.pathname).toBe("/partenaire/offresdemploi/v2/offres/search");
    expect(url.searchParams.get("motsCles")).toBe("Développeur");
    expect(url.searchParams.get("departement")).toBe("44");
    expect(url.searchParams.get("typeContrat")).toBe("CDI");
    expect(url.searchParams.get("publieeDepuis")).toBe("1");
    expect(url.searchParams.get("range")).toBe("0-149");
  });

  it("searches by ROME job, without keywords, for a query built from one", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockImplementation(async () => jsonResponse({ resultats: [] }));

    await createSource(fetchImpl).search({
      ...QUERY,
      keywords: "",
      romeCodes: ["M1855"],
    });

    const url = new URL(String(fetchImpl.mock.calls[1]?.[0]));
    expect(url.searchParams.get("codeROME")).toBe("M1855");
    expect(url.searchParams.has("motsCles")).toBe(false);
  });

  it("stops paginating on the first short page", async () => {
    const fullPage = Array.from({ length: 150 }, (_, index) =>
      makeOffer(`full-${index}`),
    );
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ resultats: fullPage }, 206))
      .mockResolvedValueOnce(jsonResponse({ resultats: [makeOffer("last")] }, 206));
    const source = createSource(fetchImpl);

    const listings = await source.search(QUERY);

    expect(listings).toHaveLength(151);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(new URL(String(fetchImpl.mock.calls[2]?.[0])).searchParams.get("range")).toBe(
      "150-299",
    );
  });

  it("reads a 204 as no offer, not as an error", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const source = createSource(fetchImpl);

    expect(await source.search(QUERY)).toEqual([]);
  });

  it("retries a throttled page once, after pausing the source", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse({ message: "slow down" }, 429, { "retry-after": "2" }),
      )
      .mockResolvedValueOnce(jsonResponse({ resultats: [makeOffer("1")] }));
    const source = createSource(fetchImpl);

    const listings = await source.search(QUERY);

    expect(listings).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("gives up on a page rather than looping, and keeps what it has", async () => {
    const fullPage = Array.from({ length: 150 }, (_, index) =>
      makeOffer(`full-${index}`),
    );
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(jsonResponse({ resultats: fullPage }, 206))
      .mockImplementation(async () => jsonResponse({ message: "nope" }, 400));
    const source = createSource(fetchImpl);

    // The first page is kept; the failed second page stops the pagination
    // instead of walking all eight ranges.
    expect(await source.search(QUERY)).toHaveLength(150);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("drops an offer it cannot map instead of failing the page", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        jsonResponse({ resultats: [makeOffer("1"), { intitule: "sans id" }] }),
      );
    const source = createSource(fetchImpl);

    expect(await source.search(QUERY)).toHaveLength(1);
  });

  describe("isStillOpen", () => {
    it.each([
      [200, true],
      [204, false],
      [404, false],
    ])("reads %i as %s", async (status, expected) => {
      const body = status === 200 ? jsonResponse(makeOffer("1")) : new Response(null, { status });
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(body);

      expect(await createSource(fetchImpl).isStillOpen("1")).toBe(expected);
    });

    it("answers unknown, never closed, when the check itself failed", async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockRejectedValueOnce(new Error("network down"));

      // A network blip must not drop a live offer from the selection.
      expect(await createSource(fetchImpl).isStillOpen("1")).toBeNull();
    });

    it("answers unknown when the source throttles the check", async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(jsonResponse({}, 429));

      expect(await createSource(fetchImpl).isStillOpen("1")).toBeNull();
    });
  });
});

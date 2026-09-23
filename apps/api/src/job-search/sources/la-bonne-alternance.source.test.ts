import { describe, expect, it, vi } from "vitest";
import type { JobSourceQuery } from "../job-search.types";
import { resolveLaBonneAlternanceConfig } from "./la-bonne-alternance.config";
import { LaBonneAlternanceSource } from "./la-bonne-alternance.source";
import { SourceRateLimiter } from "./source-rate-limiter";

const QUERY: JobSourceQuery = {
  contractTypes: ["alternance"],
  department: "44",
  experienceLevel: null,
  keywords: "Comptable",
  nafDivisions: [],
  publishedSinceDays: 1,
};

function makeOffer(id: string) {
  return {
    apply: { url: `https://labonnealternance.apprentissage.beta.gouv.fr/${id}` },
    contract: { remote: "onsite", type: ["Apprentissage"] },
    identifier: { id, partner_job_id: id, partner_label: "LBA" },
    offer: {
      description: "Une alternance.",
      publication: { creation: "2026-09-20T08:00:00.000Z" },
      status: "Active",
      title: `Alternant ${id}`,
    },
    workplace: {
      location: { address: "1 rue X, 44000 Nantes" },
      name: "ACME",
    },
  };
}

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...headers },
    status,
  });
}

/** A limiter that never waits, so the tests assert calls and not timing. */
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

function createSource(
  fetchImpl: ReturnType<typeof vi.fn>,
  env: NodeJS.ProcessEnv = { LA_BONNE_ALTERNANCE_API_KEY: "key" },
) {
  return new LaBonneAlternanceSource(
    resolveLaBonneAlternanceConfig(env),
    fetchImpl as unknown as typeof globalThis.fetch,
    () => 0,
    instantLimiter(),
  );
}

describe("LaBonneAlternanceSource.search", () => {
  it("reads a department's apprenticeships", async () => {
    const fetchImpl = vi.fn(async (_url: string) =>
      jsonResponse({ jobs: [makeOffer("a"), makeOffer("b")], recruiters: [] }),
    );
    const listings = await createSource(fetchImpl).search(QUERY);

    expect(listings).toHaveLength(2);
    expect(listings[0]).toMatchObject({
      contractType: "alternance",
      department: "44",
      source: "la_bonne_alternance",
    });

    const url = new URL(fetchImpl.mock.calls[0]![0] as string);
    expect(url.pathname).toBe("/api/job/v1/search");
    expect(url.searchParams.get("departements")).toBe("44");
  });

  it("sends the key as a bearer, with no token exchange", async () => {
    const fetchImpl = vi.fn(
      async (_url: string, _init?: RequestInit) => jsonResponse({ jobs: [] }),
    );
    await createSource(fetchImpl).search(QUERY);

    const headers = fetchImpl.mock.calls[0]![1]?.headers as Record<
      string,
      string
    >;
    expect(headers.authorization).toBe("Bearer key");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not call at all for a query nobody wants an alternance for", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ jobs: [] }));
    const listings = await createSource(fetchImpl).search({
      ...QUERY,
      contractTypes: ["cdi"],
    });

    expect(listings).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("asks once for a department, however many queries share it", async () => {
    // The API ignores keywords, so two queries differing only by keywords are
    // the same call — twenty of them would be twenty identical requests.
    const fetchImpl = vi.fn(async () => jsonResponse({ jobs: [makeOffer("a")] }));
    const source = createSource(fetchImpl);

    await source.search(QUERY);
    const second = await source.search({ ...QUERY, keywords: "Vendeur" });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(second).toHaveLength(1);
  });

  it("asks again for another department", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ jobs: [] }));
    const source = createSource(fetchImpl);

    await source.search(QUERY);
    await source.search({ ...QUERY, department: "75" });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("stays silent without a key", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ jobs: [] }));
    const listings = await createSource(fetchImpl, {}).search(QUERY);

    expect(listings).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("retries a throttle, then keeps what it got", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({}, 429, { "retry-after": "1" }),
      )
      .mockResolvedValueOnce(jsonResponse({ jobs: [makeOffer("a")] }));

    expect(await createSource(fetchImpl).search(QUERY)).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns nothing on a rejected call, and caches nothing", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: "nope" }, 401));
    const source = createSource(fetchImpl);

    expect(await source.search(QUERY)).toEqual([]);
    // A failure must not be remembered as "this department is empty" — and a
    // 401 is not retried, so each search is exactly one call.
    await source.search(QUERY);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("LaBonneAlternanceSource.isStillOpen", () => {
  it("says nothing about an offer relayed from a partner", async () => {
    // That id belongs to France Travail, not here: the endpoint would answer
    // 404 and a live offer would vanish from a candidate's selection.
    const fetchImpl = vi.fn(async () => jsonResponse({}));

    expect(
      await createSource(fetchImpl).isStillOpen("partner:France Travail:987"),
    ).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reads the status, not the 200", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ offer: { status: "Filled" } }),
    );

    expect(await createSource(fetchImpl).isStillOpen("lba-1")).toBe(false);
  });

  it("confirms an active offer", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ offer: { status: "Active" } }),
    );

    expect(await createSource(fetchImpl).isStillOpen("lba-1")).toBe(true);
  });

  it("treats a missing offer as closed", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 404));

    expect(await createSource(fetchImpl).isStillOpen("lba-1")).toBe(false);
  });

  it("answers null when it cannot tell", async () => {
    const source = createSource(vi.fn(async () => jsonResponse({}, 500)));
    expect(await source.isStillOpen("lba-1")).toBeNull();

    const broken = createSource(
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    expect(await broken.isStillOpen("lba-1")).toBeNull();
  });
});

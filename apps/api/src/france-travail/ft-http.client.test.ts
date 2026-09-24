import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SourceRateLimiter } from "../shared/rate-limit/source-rate-limiter";
import { createFtHttpClient, FtHttpClient } from "./ft-http.client";
import { resolveFtConfig } from "./ft.config";

const ENV = {
  FRANCE_TRAVAIL_APIS: "offres,romeo",
  FRANCE_TRAVAIL_CLIENT_ID: "id",
  FRANCE_TRAVAIL_CLIENT_SECRET: "secret",
};

function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...headers },
    status,
  });
}

const isTokenCall = (url: unknown) => String(url).includes("access_token");

/** Answers tokens itself; `api` answers every other call, in order. */
function fakeFetch(...api: Array<Response | Error>) {
  const queue = [...api];

  return vi.fn(async (url: string) => {
    if (isTokenCall(url))
      return jsonResponse({ access_token: "t", expires_in: 1499 });

    const next = queue.shift();
    if (!next) throw new Error(`unexpected call to ${url}`);
    if (next instanceof Error) throw next;
    return next;
  });
}

function createClient(
  fetchImpl: ReturnType<typeof vi.fn>,
  env: NodeJS.ProcessEnv = ENV,
) {
  const limiters: Array<{ rps: number; limiter: SourceRateLimiter }> = [];
  const client = new FtHttpClient(
    resolveFtConfig(env),
    fetchImpl as unknown as typeof globalThis.fetch,
    () => 0,
    undefined,
    (rps) => {
      let now = 0;
      const limiter = new SourceRateLimiter({
        now: () => now,
        requestsPerSecond: 1000,
        sleep: async (delayMs) => {
          now += delayMs;
        },
      });
      limiters.push({ limiter, rps });
      return limiter;
    },
  );

  return { client, limiters };
}

function apiCalls(fetchImpl: ReturnType<typeof vi.fn>) {
  return fetchImpl.mock.calls.filter(([url]) => !isTokenCall(url));
}

afterEach(() => vi.restoreAllMocks());

describe("FtHttpClient", () => {
  it("never calls an API that is not enabled", async () => {
    const fetchImpl = fakeFetch();
    const { client } = createClient(fetchImpl);

    const result = await client.request("rome-metiers", {
      path: "/metiers/metier",
    });

    expect(result).toMatchObject({ kind: "unavailable", reason: "disabled" });
    expect(client.isEnabled("rome-metiers")).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("builds the URL from the API base, drops empty parameters, and sends the token", async () => {
    const fetchImpl = fakeFetch(jsonResponse({ resultats: [] }, 206));
    const { client } = createClient(fetchImpl);

    const result = await client.request("offres", {
      path: "/offres/search",
      query: { departement: "", motsCles: "développeur", range: "0-149" },
    });

    expect(result).toEqual({
      data: { resultats: [] },
      kind: "ok",
      status: 206,
    });
    const [url, init] = apiCalls(fetchImpl)[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?motsCles=d%C3%A9veloppeur&range=0-149",
    );
    expect(init).toMatchObject({
      body: undefined,
      headers: { authorization: "Bearer t" },
      method: "GET",
    });
  });

  it("posts a JSON body", async () => {
    const fetchImpl = fakeFetch(jsonResponse([{ metiersRome: [] }]));
    const { client } = createClient(fetchImpl);

    await client.request("romeo", {
      body: { appellations: [{ identifiant: "1", intitule: "boulanger" }] },
      method: "POST",
      path: "/predictionMetiers",
    });

    const [, init] = apiCalls(fetchImpl)[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "content-type": "application/json" });
    expect(JSON.parse(String(init.body))).toEqual({
      appellations: [{ identifiant: "1", intitule: "boulanger" }],
    });
  });

  it.each([204, 404])("reads %i as an empty answer", async (status) => {
    const { client } = createClient(fakeFetch(new Response(null, { status })));

    expect(await client.request("offres", { path: "/offres/1" })).toEqual({
      kind: "empty",
      status,
    });
  });

  it("gives each API its own limiter, at its own pace", async () => {
    const fetchImpl = fakeFetch(
      jsonResponse({}),
      jsonResponse([]),
      jsonResponse({}),
    );
    const { client, limiters } = createClient(fetchImpl, {
      ...ENV,
      FRANCE_TRAVAIL_ROMEO_REQUESTS_PER_SECOND: "2",
    });

    await client.request("offres", { path: "/offres/search" });
    await client.request("romeo", {
      method: "POST",
      path: "/predictionMetiers",
    });
    await client.request("offres", { path: "/offres/search" });

    expect(limiters.map(({ rps }) => rps)).toEqual([4, 2]);
  });

  it("pauses the API and retries once after a 429", async () => {
    const fetchImpl = fakeFetch(
      jsonResponse({ message: "slow down" }, 429, { "retry-after": "2" }),
      jsonResponse({ ok: true }),
    );
    const { client, limiters } = createClient(fetchImpl);
    const pause = vi.spyOn(SourceRateLimiter.prototype, "pauseUntil");

    expect(await client.request("offres", { path: "/x" })).toMatchObject({
      kind: "ok",
    });
    expect(pause).toHaveBeenCalledWith(2000);
    expect(limiters).toHaveLength(1);
  });

  it("reports a throttle that outlasts every attempt", async () => {
    const { client } = createClient(
      fakeFetch(
        new Response("busy", { status: 503 }),
        new Response("busy", { status: 503 }),
      ),
    );

    expect(await client.request("offres", { path: "/x" })).toEqual({
      detail: "busy",
      kind: "unavailable",
      reason: "throttled",
      status: 503,
    });
  });

  it("does not retry a rejected call, and keeps the reason given", async () => {
    const fetchImpl = fakeFetch(
      new Response("Le paramètre range est invalide", { status: 400 }),
    );
    const { client } = createClient(fetchImpl);

    expect(await client.request("offres", { path: "/x" })).toEqual({
      detail: "Le paramètre range est invalide",
      kind: "unavailable",
      reason: "rejected",
      status: 400,
    });
    expect(apiCalls(fetchImpl)).toHaveLength(1);
  });

  it("honours a single attempt", async () => {
    const fetchImpl = fakeFetch(jsonResponse({}, 429));
    const { client } = createClient(fetchImpl);

    expect(
      await client.request("offres", { attempts: 1, path: "/x" }),
    ).toMatchObject({
      reason: "throttled",
    });
    expect(apiCalls(fetchImpl)).toHaveLength(1);
  });

  it("retries a network failure, then reports it", async () => {
    const fetchImpl = fakeFetch(
      new Error("socket hang up"),
      new Error("socket hang up"),
    );
    const { client } = createClient(fetchImpl);

    expect(await client.request("offres", { path: "/x" })).toMatchObject({
      kind: "unavailable",
      reason: "network",
      status: null,
    });
    expect(apiCalls(fetchImpl)).toHaveLength(2);
  });

  it("drops a rejected token and asks for a new one on 401", async () => {
    const fetchImpl = fakeFetch(
      jsonResponse({}, 401),
      jsonResponse({ ok: true }),
    );
    const { client } = createClient(fetchImpl);

    expect(await client.request("offres", { path: "/x" })).toMatchObject({
      kind: "ok",
    });
    expect(
      fetchImpl.mock.calls.filter(([url]) => isTokenCall(url)),
    ).toHaveLength(2);
  });

  it("reports a success that is not JSON", async () => {
    const { client } = createClient(
      fakeFetch(new Response("<html>", { status: 200 })),
    );

    expect(await client.request("offres", { path: "/x" })).toMatchObject({
      kind: "unavailable",
      reason: "malformed",
      status: 200,
    });
  });

  it("turns an API off on invalid_scope, without touching the others", async () => {
    const warn = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      if (isTokenCall(url)) {
        return new URLSearchParams(String(init.body)).get("scope") ===
          "api_romeov2"
          ? jsonResponse({ error: "invalid_scope" }, 400)
          : jsonResponse({ access_token: "t", expires_in: 1499 });
      }
      return jsonResponse({ ok: true });
    });
    const { client } = createClient(fetchImpl);

    expect(
      await client.request("romeo", { path: "/predictionMetiers" }),
    ).toMatchObject({
      reason: "unsubscribed",
      status: 400,
    });
    expect(client.isEnabled("romeo")).toBe(false);
    expect(
      await client.request("romeo", { path: "/predictionMetiers" }),
    ).toMatchObject({
      reason: "disabled",
    });
    expect(await client.request("offres", { path: "/x" })).toMatchObject({
      kind: "ok",
    });
    // One token attempt for ROMEO, one for Offres: the unsubscribed API is not asked again.
    expect(
      fetchImpl.mock.calls.filter(([url]) => isTokenCall(url)),
    ).toHaveLength(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("invalid_scope"));
  });

  it("turns an API off on a 403, once a token was granted but the API was not", async () => {
    vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const fetchImpl = fakeFetch(new Response("Invalid scope", { status: 403 }));
    const { client } = createClient(fetchImpl);

    expect(await client.request("offres", { path: "/x" })).toEqual({
      detail: "Invalid scope",
      kind: "unavailable",
      reason: "unsubscribed",
      status: 403,
    });
    expect(client.isEnabled("offres")).toBe(false);
    expect(apiCalls(fetchImpl)).toHaveLength(1);
  });

  it("reports a bad secret as an auth failure, without retrying", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: "invalid_client" }, 401),
    );
    const { client } = createClient(fetchImpl);

    expect(await client.request("offres", { path: "/x" })).toMatchObject({
      kind: "unavailable",
      reason: "auth",
      status: 401,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(client.isEnabled("offres")).toBe(true);
  });

  it("retries once when the token endpoint itself is down", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      isTokenCall(url)
        ? new Response("down", { status: 502 })
        : jsonResponse({}),
    );
    const { client } = createClient(fetchImpl);

    expect(await client.request("offres", { path: "/x" })).toMatchObject({
      reason: "auth",
      status: 502,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("reports a token request that got no answer as a network failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ENOTFOUND");
    });
    const { client } = createClient(fetchImpl);

    expect(await client.request("offres", { path: "/x" })).toMatchObject({
      reason: "network",
    });
  });
});

describe("warnAboutInertApis", () => {
  it("names the inert APIs and the unknown names once at boot", () => {
    const warn = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);

    createFtHttpClient({ ...ENV, FRANCE_TRAVAIL_APIS: "offres,romeo,romeoo" });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"romeoo"'));
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "rome-metiers, rome-competences, rome-fiches-metiers, rome-substitutions, la-bonne-boite, marche-travail",
      ),
    );
  });

  it("says once that nothing will be called without credentials", () => {
    const warn = vi
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);

    createFtHttpClient({});

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no credentials"),
    );
  });
});

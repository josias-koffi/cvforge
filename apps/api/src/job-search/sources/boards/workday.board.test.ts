import { describe, expect, it, vi } from "vitest";
import { BoardHttpClient } from "./board-http";
import { BoardNotFoundError, BoardRefusedError } from "./board.types";
import { isPathAllowed } from "./robots-rules";
import { parseWorkdayToken } from "./workday.config";
import { WorkdayBoard } from "./workday.board";

/**
 * Shapes copied from what Eiffage's and Sanofi's Workday tenants answered on
 * 2026-11-04. Field names are Workday's own.
 */

const TOKEN = "eiffage.wd3/Eiffage_Careers";
const ROBOTS = "Sitemap: https://eiffage.wd3.myworkdayjobs.com/Eiffage_Careers/siteMap.xml\n\nUser-agent: *\nAllow: /Eiffage_Careers/\nDisallow: /refreshFacet/\n";

function item(index: number) {
  return {
    externalPath: `/job/Paris/Conducteur-de-travaux-${index}_JR2026-${index}`,
    locationsText: "Paris",
    postedOn: "Posted Today",
    title: `Conducteur de travaux ${index}`,
  };
}

function detail(country = "France") {
  return {
    jobPostingInfo: {
      country: { descriptor: country, id: "54c5b6971ffb4bf0b116fe7651ec789a" },
      externalUrl: "https://eiffage.wd3.myworkdayjobs.com/Eiffage_Careers/job/Paris/Conducteur-de-travaux-1_JR2026-1",
      jobDescription: "<p>Vous <strong>pilotez</strong> des chantiers en CDI.</p>",
      jobReqId: "JR2026-1",
      location: "Paris",
      postedOn: "Posted Today",
      startDate: "2026-11-04",
      timeType: "Full time",
    },
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status });

function setup(options: {
  robots?: string | number;
  items?: number;
  detailCountry?: string;
}) {
  const total = options.items ?? 2;
  const calls: Array<{ url: string; method: string; body?: unknown }> = [];
  const fetchImpl = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ body: init?.body ? JSON.parse(String(init.body)) : undefined, method, url });

    if (url.endsWith("/robots.txt")) {
      return typeof options.robots === "number"
        ? new Response("", { status: options.robots })
        : new Response(options.robots ?? ROBOTS);
    }
    if (method === "POST") {
      const offset = (JSON.parse(String(init!.body)) as { offset: number }).offset;
      const page = Array.from({ length: Math.min(20, total - offset) }, (_, i) => item(offset + i + 1));

      // Like Workday: the total on the first page, 0 on the others.
      return json({ jobPostings: page, total: offset === 0 ? total : 0 });
    }

    return json(detail(options.detailCountry));
  });
  let now = Date.parse("2026-11-04T10:00:00Z");
  const client = new BoardHttpClient(
    fetchImpl as unknown as typeof globalThis.fetch,
    () => now,
    5_000,
    async (delayMs: number) => {
      now += delayMs;
    },
  );

  return { board: new WorkdayBoard(client, () => now), calls };
}

describe("WorkdayBoard", () => {
  it("asks for France only, then reads each offer's detail", async () => {
    const { board, calls } = setup({ items: 2 });

    const listings = await board.fetchBoard(TOKEN);

    const search = calls.find((call) => call.method === "POST")!;
    expect(search.url).toBe("https://eiffage.wd3.myworkdayjobs.com/wday/cxs/eiffage/Eiffage_Careers/jobs");
    expect(search.body).toMatchObject({
      appliedFacets: { locationCountry: ["54c5b6971ffb4bf0b116fe7651ec789a"] },
      limit: 20,
      offset: 0,
    });
    expect(listings).toHaveLength(2);
    expect(listings[0]).toMatchObject({
      applyUrl: "https://eiffage.wd3.myworkdayjobs.com/Eiffage_Careers/job/Paris/Conducteur-de-travaux-1_JR2026-1",
      companyName: "Eiffage",
      contractType: "cdi",
      department: "75",
      description: "Vous pilotez des chantiers en CDI.",
      externalId: "JR2026-1",
      publishedAt: "2026-11-04T00:00:00.000Z",
      source: "workday",
      title: "Conducteur de travaux 1",
    });
  });

  it("pages through the list, 20 offers at a time", async () => {
    const { board, calls } = setup({ items: 45 });

    expect(await board.fetchBoard(TOKEN)).toHaveLength(45);
    expect(calls.filter((call) => call.method === "POST").map((call) => (call.body as { offset: number }).offset)).toEqual([0, 20, 40]);
  });

  it("does not fetch the detail of an offer the frequent pass already knows", async () => {
    const { board, calls } = setup({ items: 2 });

    const listings = await board.fetchBoard(TOKEN, { skipExternalIds: new Set(["JR2026-1"]) });

    expect(listings.map((listing) => listing.externalId)).toEqual(["JR2026-2"]);
    expect(calls.filter((call) => call.method === "GET" && !call.url.endsWith("robots.txt"))).toHaveLength(1);
  });

  it("remembers what it read, so the next pass costs a list and no detail", async () => {
    const { board, calls } = setup({ items: 2 });

    await board.fetchBoard(TOKEN);
    const detailsAfterFirst = calls.filter((call) => call.url.includes("/job/")).length;
    const second = await board.fetchBoard(TOKEN);

    expect(second).toHaveLength(2);
    expect(calls.filter((call) => call.url.includes("/job/")).length).toBe(detailsAfterFirst);
  });

  it("reads at most 400 new details a run, and leaves the others out rather than blank", async () => {
    const { board } = setup({ items: 450 });

    expect(await board.fetchBoard(TOKEN)).toHaveLength(400);
  });

  it("drops an offer whose detail turns out to be abroad", async () => {
    const { board } = setup({ detailCountry: "Germany", items: 2 });

    expect(await board.fetchBoard(TOKEN)).toEqual([]);
  });

  it("refuses to read a tenant whose robots.txt forbids its careers site (Thales, Kering)", async () => {
    const { board, calls } = setup({ robots: "User-agent: *\nDisallow: /Eiffage_Careers/\n" });

    await expect(board.fetchBoard(TOKEN)).rejects.toBeInstanceOf(BoardRefusedError);
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("reads a tenant that has no robots.txt at all", async () => {
    const { board } = setup({ items: 1, robots: 404 });

    expect(await board.fetchBoard(TOKEN)).toHaveLength(1);
  });

  it("rejects a token that is not a tenant", async () => {
    const { board } = setup({});

    await expect(board.fetchBoard("not a token")).rejects.toBeInstanceOf(BoardNotFoundError);
  });
});

describe("parseWorkdayToken", () => {
  it("builds the host from the tenant and the datacenter", () => {
    expect(parseWorkdayToken("sanofi.wd3/SanofiCareers")).toEqual({
      host: "sanofi.wd3.myworkdayjobs.com",
      site: "SanofiCareers",
      tenant: "sanofi",
    });
    expect(parseWorkdayToken("ipsen.wd103/Ipsen_Careers")?.host).toBe("ipsen.wd103.myworkdayjobs.com");
    expect(parseWorkdayToken("evil.com/x")).toBeNull();
  });
});

describe("isPathAllowed", () => {
  const robots = [
    "User-agent: Greedy",
    "Disallow: /",
    "",
    "User-agent: *",
    "Allow: /Site/",
    "Disallow: /Site/private/",
    "Disallow: /refreshFacet/",
  ].join("\n");

  it("applies the group that names the agent, otherwise `*`", () => {
    expect(isPathAllowed(robots, "Greedy", "/Site/jobs")).toBe(false);
    expect(isPathAllowed(robots, "CVForgeJobBot", "/Site/jobs")).toBe(true);
  });

  it("lets the longest matching rule win", () => {
    expect(isPathAllowed(robots, "CVForgeJobBot", "/Site/private/x")).toBe(false);
    expect(isPathAllowed(robots, "CVForgeJobBot", "/refreshFacet/a")).toBe(false);
  });

  it("allows what no rule mentions, and everything when robots.txt is empty", () => {
    expect(isPathAllowed(robots, "CVForgeJobBot", "/wday/cxs/t/s/jobs")).toBe(true);
    expect(isPathAllowed("", "CVForgeJobBot", "/anything")).toBe(true);
  });

  it("understands wildcards and an end anchor", () => {
    const rules = "User-agent: *\nDisallow: /*/print$\n";

    expect(isPathAllowed(rules, "x", "/job/print")).toBe(false);
    expect(isPathAllowed(rules, "x", "/job/print/more")).toBe(true);
  });
});

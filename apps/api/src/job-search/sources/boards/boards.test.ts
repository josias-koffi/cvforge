import { describe, expect, it, vi } from "vitest";
import { AshbyBoard } from "./ashby.board";
import { BoardHttpClient } from "./board-http";
import { BoardNotFoundError } from "./board.types";
import { GreenhouseBoard } from "./greenhouse.board";
import { LeverBoard } from "./lever.board";
import { SmartRecruitersBoard } from "./smartrecruiters.board";

/**
 * The payloads below are trimmed copies of what the four APIs really answered
 * on 2026-09-23 (doctolib, swile, ledger, Sodexo). Field names are theirs, not
 * ours — that is the whole point of testing against them.
 */

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function createClient(handler: (url: string) => Response) {
  const fetchImpl = vi.fn(async (url: unknown) => handler(String(url)));
  let now = 0;
  const client = new BoardHttpClient(
    fetchImpl as unknown as typeof globalThis.fetch,
    () => now,
    5_000,
    async (delayMs: number) => {
      now += delayMs;
    },
  );

  return { client, fetchImpl };
}

describe("GreenhouseBoard", () => {
  const board = {
    jobs: [
      {
        absolute_url: "https://job-boards.greenhouse.io/doctolib/jobs/7583949003",
        company_name: "Doctolib",
        content: "&lt;p&gt;&lt;strong&gt;Rejoignez-nous&lt;/strong&gt;&lt;/p&gt;",
        first_published: "2026-09-01T08:37:47-05:00",
        id: 7583949003,
        location: { name: "Paris, France" },
        metadata: [
          { name: "Employment Type", value: "Unlimited Contract", value_type: "single_select" },
        ],
        title: "Account Executive (x/f/m)",
        updated_at: "2026-09-20T05:38:47-04:00",
      },
      {
        absolute_url: "https://job-boards.greenhouse.io/doctolib/jobs/1",
        id: 1,
        location: { name: "Berlin, Berlin, Germany" },
        title: "Account Executive Berlin",
      },
    ],
  };

  it("keeps the French offers and reads the double-escaped content", async () => {
    const { client } = createClient(() => jsonResponse(board));

    const listings = await new GreenhouseBoard(client).fetchBoard("doctolib");

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      companyName: "Doctolib",
      contractType: "cdi",
      department: "75",
      description: "Rejoignez-nous",
      externalId: "7583949003",
      source: "greenhouse",
    });
    // first_published, not updated_at: an edited typo must not look like a
    // fresh offer.
    expect(listings[0]?.publishedAt).toBe("2026-09-01T13:37:47.000Z");
  });

  it("turns a missing board into a distinct error", async () => {
    const { client } = createClient(() => jsonResponse({}, 404));

    await expect(
      new GreenhouseBoard(client).fetchBoard("disparue"),
    ).rejects.toBeInstanceOf(BoardNotFoundError);
  });
});

describe("LeverBoard", () => {
  const postings = [
    {
      additionalPlain: "Nous accueillons la diversité.",
      applyUrl: "https://jobs.lever.co/swile/8f2c/apply",
      categories: {
        allLocations: ["Paris, France"],
        commitment: "Internship",
        department: "Engineering",
        location: "Paris, France",
      },
      createdAt: 1_756_684_800_000,
      descriptionPlain: "Vous rejoindrez l'équipe produit.",
      hostedUrl: "https://jobs.lever.co/swile/8f2c",
      id: "8f2c",
      text: "Stage - Data Analyst",
    },
    {
      categories: { allLocations: ["Remote, Brasil"], location: "Remote, Brasil" },
      createdAt: 1_756_684_800_000,
      hostedUrl: "https://jobs.lever.co/swile/9a1b",
      id: "9a1b",
      text: "Engenheiro de dados",
    },
  ];

  it("reads a posting, and keeps a remote one even from abroad", async () => {
    const { client } = createClient(() => jsonResponse(postings));

    const listings = await new LeverBoard(client).fetchBoard("swile");

    expect(listings).toHaveLength(2);
    expect(listings[0]).toMatchObject({
      contractType: "stage",
      department: "75",
      source: "lever",
      title: "Stage - Data Analyst",
    });
    expect(listings[0]?.description).toContain("équipe produit");
    expect(listings[1]?.remote).toBe(true);
  });
});

describe("AshbyBoard", () => {
  const board = {
    jobs: [
      {
        address: {
          postalAddress: {
            addressCountry: "France",
            addressLocality: "Paris",
            postalCode: "75002",
          },
        },
        applyUrl: "https://jobs.ashbyhq.com/ledger/4354/application",
        descriptionPlain: "About Ledger…",
        employmentType: "FullTime",
        id: "43549294-9772",
        isListed: true,
        isRemote: true,
        jobUrl: "https://jobs.ashbyhq.com/ledger/4354",
        location: "Paris, France",
        publishedAt: "2026-09-21T14:49:17.904+00:00",
        title: "CRM Lifecycle Specialist",
        workplaceType: "Hybrid",
      },
      {
        id: "unlisted",
        isListed: false,
        location: "Paris, France",
        title: "Poste retiré du site",
      },
    ],
  };

  it("reads a listed offer and drops one the company unlisted", async () => {
    const { client } = createClient(() => jsonResponse(board));

    const listings = await new AshbyBoard(client).fetchBoard("ledger");

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      department: "75",
      externalId: "43549294-9772",
      remote: true,
      source: "ashby",
    });
  });
});

describe("SmartRecruitersBoard", () => {
  const listing = {
    content: [
      {
        company: { identifier: "Sodexo", name: "Sodexo" },
        id: "744000151238125",
        location: {
          city: "Lyon",
          country: "fr",
          fullLocation: "Lyon, Rhône, France",
          postalCode: "69003",
          remote: false,
        },
        name: "Chef de partie (H/F)",
        releasedDate: "2026-09-20T02:59:22.130Z",
        typeOfEmployment: { id: "permanent", label: "Full-time" },
      },
      {
        company: { identifier: "Sodexo", name: "Sodexo" },
        id: "744000151238999",
        location: {
          city: "Western Australia",
          country: "au",
          fullLocation: "Western Australia, WA, Australia",
          remote: false,
        },
        name: "Dayshift Cafe Utility",
      },
    ],
    limit: 100,
    offset: 0,
    totalFound: 2,
  };
  const detail = {
    applyUrl: "https://jobs.smartrecruiters.com/Sodexo/744000151238125/apply",
    jobAd: {
      sections: {
        companyDescription: { text: "<p>Sodexo France</p>", title: "Entreprise" },
        jobDescription: { text: "<p>Vous dirigerez la cuisine.</p>", title: "Poste" },
      },
    },
    postingUrl: "https://careers.smartrecruiters.com/Sodexo/744000151238125",
  };

  it("fetches the advert text only for the French offers", async () => {
    const { client, fetchImpl } = createClient((url) =>
      url.includes("/postings?") ? jsonResponse(listing) : jsonResponse(detail),
    );

    const listings = await new SmartRecruitersBoard(client).fetchBoard("Sodexo");

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      contractType: "cdi",
      department: "69",
      source: "smartrecruiters",
    });
    expect(listings[0]?.description).toContain("Vous dirigerez la cuisine.");
    // One listing call, one detail call: the Australian offer costs nothing.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("keeps the offer when its advert text cannot be read", async () => {
    const { client } = createClient((url) =>
      url.includes("/postings?") ? jsonResponse(listing) : jsonResponse({}, 500),
    );

    const listings = await new SmartRecruitersBoard(client).fetchBoard("Sodexo");

    expect(listings).toHaveLength(1);
    expect(listings[0]?.description).toBe("");
  });
});

describe("BoardHttpClient", () => {
  it("retries once after a throttle, then succeeds", async () => {
    let calls = 0;
    const { client } = createClient(() => {
      calls += 1;
      return calls === 1 ? jsonResponse({}, 429) : jsonResponse({ jobs: [] });
    });

    await expect(new GreenhouseBoard(client).fetchBoard("acme")).resolves.toEqual([]);
    expect(calls).toBe(2);
  });

  it("gives up after the second failure", async () => {
    const { client, fetchImpl } = createClient(() => jsonResponse({}, 503));

    await expect(new GreenhouseBoard(client).fetchBoard("acme")).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

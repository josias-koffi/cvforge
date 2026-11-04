import { describe, expect, it, vi } from "vitest";
import { BoardHttpClient } from "./board-http";
import { BoardNotFoundError } from "./board.types";
import { PersonioBoard } from "./personio.board";
import { RecruiteeBoard } from "./recruitee.board";
import { WorkableBoard } from "./workable.board";

/**
 * Trimmed copies of what the three APIs answered on 2026-11-04 (Hugging Face
 * on Workable, bunq on Recruitee, ottonova on Personio). Field names are
 * theirs, not ours.
 */

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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { headers: { "content-type": "application/json" }, status });

describe("WorkableBoard", () => {
  const payload = {
    jobs: [
      {
        application_url: "https://apply.workable.com/j/81B46579FE/apply",
        city: "Paris",
        country: "France",
        description: "<p>Rejoignez <strong>Hugging Face</strong></p>",
        employment_type: "Full-time",
        locations: [{ city: "Paris", country: "France", countryCode: "FR", region: "Île-de-France" }],
        published_on: "2026-05-29",
        shortcode: "81B46579FE",
        telecommuting: true,
        title: "Open-Source Machine Learning Engineer",
        url: "https://apply.workable.com/j/81B46579FE",
      },
      {
        city: "Berlin",
        country: "Germany",
        locations: [{ city: "Berlin", country: "Germany", countryCode: "DE" }],
        shortcode: "BERLIN",
        title: "Account Executive",
      },
    ],
    name: "Hugging Face",
  };

  it("keeps the offers in France, named after the company", async () => {
    const { client, fetchImpl } = createClient(() => json(payload));

    const listings = await new WorkableBoard(client).fetchBoard("huggingface");

    expect(fetchImpl.mock.calls[0]![0]).toBe(
      "https://apply.workable.com/api/v1/widget/accounts/huggingface?details=true",
    );
    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      applyUrl: "https://apply.workable.com/j/81B46579FE/apply",
      companyName: "Hugging Face",
      department: "75",
      description: "Rejoignez Hugging Face",
      externalId: "81B46579FE",
      publishedAt: "2026-05-29T00:00:00.000Z",
      remote: true,
      source: "workable",
    });
  });

  it("reports a missing company as gone", async () => {
    const { client } = createClient(() => new Response("", { status: 404 }));

    await expect(new WorkableBoard(client).fetchBoard("nobody")).rejects.toBeInstanceOf(
      BoardNotFoundError,
    );
  });
});

describe("RecruiteeBoard", () => {
  const payload = {
    offers: [
      {
        careers_apply_url: "https://careers.bunq.com/o/data-analyst-paris/c/new",
        careers_url: "https://careers.bunq.com/o/data-analyst-paris",
        company_name: "bunq",
        description: "<p>Analyse des données</p>",
        employment_type_code: "fulltime_permanent",
        id: 2804402,
        locations: [{ city: "Paris", country: "France", country_code: "FR", name: "Paris, France" }],
        mailbox_email: "job.1@bunq.recruitee.com",
        published_at: "2026-10-30 16:32:58 UTC",
        remote: false,
        requirements: "<ul><li>SQL</li></ul>",
        status: "published",
        title: "Data Analyst",
      },
      {
        city: "Vienna",
        country: "Austria",
        country_code: "AT",
        id: 2804401,
        location: "Vienna, Wien, Austria",
        status: "published",
        title: "AML Manager, Austria",
      },
      { id: 1, location: "Paris, France", status: "draft", title: "Draft" },
    ],
  };

  it("keeps the published offers in France, contract read from the type code", async () => {
    const { client } = createClient(() => json(payload));

    const listings = await new RecruiteeBoard(client).fetchBoard("bunq");

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      applyUrl: "https://careers.bunq.com/o/data-analyst-paris/c/new",
      companyName: "bunq",
      contractType: "cdi",
      department: "75",
      description: "Analyse des données\n\nSQL",
      externalId: "2804402",
      publishedAt: "2026-10-30T16:32:58.000Z",
      source: "recruitee",
    });
  });

  it("accepts a board with no offer at all", async () => {
    const { client } = createClient(() => json({ offers: [] }));

    expect(await new RecruiteeBoard(client).fetchBoard("tellent")).toEqual([]);
  });
});

describe("PersonioBoard", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<workzag-jobs>
  <position>
    <id>2573573</id>
    <subcompany>ottonova SAS</subcompany>
    <office>Paris</office>
    <additionalOffices><office>Köln</office></additionalOffices>
    <department>Risk &amp; Actuary</department>
    <name>Actuaire senior (h/f/d)</name>
    <jobDescriptions>
      <jobDescription><name>VOTRE ÉQUIPE</name><value><![CDATA[<p>Une assurance <strong>100 % digitale</strong></p>]]></value></jobDescription>
      <jobDescription><name>URL</name><value><![CDATA[actuaire-senior]]></value></jobDescription>
    </jobDescriptions>
    <employmentType>permanent</employmentType>
    <createdAt>2026-03-23T15:24:29+00:00</createdAt>
  </position>
  <position>
    <id>9</id>
    <office>München</office>
    <name>Werkstudent</name>
    <employmentType>intern</employmentType>
  </position>
</workzag-jobs>`;

  it("reads the feed, keeping the offers whose office is in France", async () => {
    const { client, fetchImpl } = createClient(() => new Response(xml));

    const listings = await new PersonioBoard(client).fetchBoard("ottonova");

    expect(fetchImpl.mock.calls[0]![0]).toBe("https://ottonova.jobs.personio.de/xml");
    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      applyUrl: "https://ottonova.jobs.personio.de/job/2573573",
      companyName: "ottonova SAS",
      contractType: "cdi",
      department: "75",
      description: "Une assurance 100 % digitale",
      externalId: "2573573",
      publishedAt: "2026-03-23T15:24:29.000Z",
      source: "personio",
      title: "Actuaire senior (h/f/d)",
    });
  });

  it("refuses an HTML page served for an unknown company", async () => {
    const { client } = createClient(() => new Response("<html>Page Not Found</html>"));

    await expect(new PersonioBoard(client).fetchBoard("nobody")).rejects.toThrow(/no job feed/);
  });

  it("accepts a feed with no position", async () => {
    const { client } = createClient(() => new Response("<workzag-jobs>\n</workzag-jobs>"));

    expect(await new PersonioBoard(client).fetchBoard("personio")).toEqual([]);
  });
});

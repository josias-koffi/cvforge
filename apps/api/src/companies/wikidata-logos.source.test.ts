import { describe, expect, it } from "vitest";
import { readLogos, WikidataLogosSource } from "./wikidata-logos.source";

const OVH_THUMBNAIL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Logo_OVH.svg/120px-Logo_OVH.svg.png";

function claims(sirens: string[], logos: string[]) {
  const statement = (value: string) => ({ mainsnak: { datavalue: { value } } });
  return {
    claims: { P154: logos.map(statement), P1616: sirens.map(statement) },
  };
}

/** Answers the search, then the items, as the live API did on 2026-09-24. */
function wikidata(answers: {
  search: string[];
  entities: Record<string, unknown>;
}) {
  const urls: URL[] = [];
  const fetchImpl = (async (url: string) => {
    const parsed = new URL(url);
    urls.push(parsed);
    return parsed.searchParams.get("action") === "query"
      ? Response.json({
          query: { search: answers.search.map((title) => ({ title })) },
        })
      : Response.json({ entities: answers.entities });
  }) as typeof fetch;

  return { fetchImpl, urls };
}

describe("WikidataLogosSource", () => {
  it("searches the SIRENs fifteen at a time, then reads the items found", async () => {
    const sirens = Array.from({ length: 20 }, (_, index) =>
      String(424761400 + index),
    );
    const { fetchImpl, urls } = wikidata({
      entities: { Q568183: claims(["424761419"], ["Logo OVH.svg"]) },
      search: ["Q568183"],
    });

    const logos = await new WikidataLogosSource(fetchImpl).find([
      ...sirens,
      "x|P31=Q5",
    ]);

    const searches = urls.filter(
      (url) => url.searchParams.get("action") === "query",
    );
    expect(searches).toHaveLength(2);
    // The search stays under the API's 300 characters, and the junk is out.
    for (const search of searches) {
      expect(search.searchParams.get("srsearch")!.length).toBeLessThanOrEqual(
        300,
      );
      expect(search.searchParams.get("srsearch")).not.toContain("P31");
    }
    // Found by both searches, read once.
    expect(urls.at(-1)?.searchParams.get("ids")).toBe("Q568183");
    expect([...(logos ?? new Map())]).toEqual([["424761419", OVH_THUMBNAIL]]);
  });

  it("says it failed rather than that no company has a logo", async () => {
    const failing = (async () =>
      new Response("", { status: 503 })) as typeof fetch;

    expect(
      await new WikidataLogosSource(failing).find(["424761419"]),
    ).toBeUndefined();
    expect(await new WikidataLogosSource(failing).find([])).toEqual(new Map());
  });

  it("keeps only the SIRENs it was asked about", async () => {
    const { fetchImpl } = wikidata({
      // A group whose item also lists a subsidiary's SIREN.
      entities: { Q1: claims(["111111111", "424761419"], ["Logo OVH.svg"]) },
      search: ["Q1"],
    });

    const logos = await new WikidataLogosSource(fetchImpl).find(["424761419"]);

    expect([...(logos ?? new Map()).keys()]).toEqual(["424761419"]);
  });
});

describe("readLogos", () => {
  it("keeps the first logo of an item, and skips an item without one", () => {
    const logos = readLogos({
      entities: {
        Q1: claims(["424761419"], ["Logo OVH.svg", "Old.png"]),
        Q2: claims(["381031285"], []),
      } as never,
    });

    expect([...logos]).toEqual([["424761419", OVH_THUMBNAIL]]);
  });
});

import { describe, expect, it } from "vitest";
import { SourceRateLimiter } from "../shared/rate-limit/source-rate-limiter";
import { CompanySources } from "./company-sources";

const SIREN = "381983568";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function sources(answers: Record<string, () => Response>) {
  const asked: string[] = [];
  const fetchImpl = (async (url: string) => {
    asked.push(url);
    const host = new URL(url).host;
    const answer = answers[host];
    if (!answer) throw new Error(`unexpected ${url}`);
    return answer();
  }) as typeof fetch;
  const limiter = new SourceRateLimiter({
    requestsPerSecond: 1_000,
    sleep: async () => undefined,
  });

  return { asked, sources: new CompanySources(fetchImpl, Date.now, limiter) };
}

const ANNUAIRE = "recherche-entreprises.api.gouv.fr";
const EGAPRO = "egapro.travail.gouv.fr";

function annuaire(egapro: boolean) {
  return json({
    results: [
      {
        complements: { egapro_renseignee: egapro },
        nom_raison_sociale: "EVERIENCE",
        siren: SIREN,
      },
    ],
  });
}

describe("CompanySources", () => {
  it("asks Egapro only for a company that declared its index", async () => {
    const declared = sources({
      [ANNUAIRE]: () => annuaire(true),
      [EGAPRO]: () => json({ data: [{ entreprise: { siren: SIREN }, notes: { "2025": 94 } }] }),
    });
    const silent = sources({ [ANNUAIRE]: () => annuaire(false) });

    expect(await declared.sources.read(SIREN)).toMatchObject({
      egaproScore: 94,
      egaproYear: "2025",
      legalName: "EVERIENCE",
    });
    expect(declared.asked[0]).toBe(
      `https://${ANNUAIRE}/search?q=${SIREN}&page=1&per_page=1`,
    );
    expect(await silent.sources.read(SIREN)).toMatchObject({ egaproScore: null });
    expect(silent.asked).toHaveLength(1);
  });

  it("tells an unknown SIREN from a failed call", async () => {
    expect(
      await sources({ [ANNUAIRE]: () => json({ results: [] }) }).sources.read(SIREN),
    ).toBeNull();
    expect(
      await sources({ [ANNUAIRE]: () => json({}, 429) }).sources.read(SIREN),
    ).toBeUndefined();
    expect(
      await sources({
        [ANNUAIRE]: () => {
          throw new TypeError("fetch failed");
        },
      }).sources.read(SIREN),
    ).toBeUndefined();
  });

  it("keeps the record when only Egapro fails", async () => {
    expect(
      await sources({
        [ANNUAIRE]: () => annuaire(true),
        [EGAPRO]: () => json({}, 503),
      }).sources.read(SIREN),
    ).toMatchObject({ egaproScore: null, legalName: "EVERIENCE" });
  });

  it("searches by name, and answers an empty list apart from a failure", async () => {
    const found = sources({ [ANNUAIRE]: () => annuaire(false) });

    expect(await found.sources.search("helpline nantes", 8)).toHaveLength(1);
    expect(found.asked[0]).toBe(
      `https://${ANNUAIRE}/search?q=helpline%20nantes&page=1&per_page=8`,
    );
    expect(
      await sources({ [ANNUAIRE]: () => json({}) }).sources.search("zzz", 8),
    ).toEqual([]);
    expect(
      await sources({ [ANNUAIRE]: () => json({}, 500) }).sources.search("zzz", 8),
    ).toBeUndefined();
  });
});

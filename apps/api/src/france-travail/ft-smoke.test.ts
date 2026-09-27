import { describe, expect, it, vi } from "vitest";
import { describeResult, describeShape, smokeFtApi } from "./ft-smoke";

const CREDENTIALS = {
  FRANCE_TRAVAIL_CLIENT_ID: "id",
  FRANCE_TRAVAIL_CLIENT_SECRET: "secret",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("smokeFtApi", () => {
  it("calls an API even when FRANCE_TRAVAIL_APIS leaves it out", async () => {
    const fetchImpl = vi.fn(async (url: string) =>
      url.includes("access_token")
        ? jsonResponse({ access_token: "t", expires_in: 1499 })
        : jsonResponse([{ metiersRome: [{}, {}], uuidInference: "u" }]),
    );

    const lines = await smokeFtApi(
      "romeo",
      { ...CREDENTIALS, FRANCE_TRAVAIL_APIS: "offres" },
      fetchImpl as unknown as typeof globalThis.fetch,
    );

    expect(lines[0]).toBe("romeo — ROMEO v2");
    expect(lines).toContain("  scope : api_romeov2");
    expect(lines.join("\n")).toContain(
      "clés du premier : metiersRome[2], uuidInference",
    );
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      "https://api.francetravail.io/partenaire/romeo/v2/predictionMetiers",
    );
  });

  it("stops before any call without credentials", async () => {
    const fetchImpl = vi.fn();

    const lines = await smokeFtApi(
      "offres",
      {},
      fetchImpl as unknown as typeof globalThis.fetch,
    );

    expect(lines[1]).toContain("⚠️");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("describeResult", () => {
  it("shows the status and the reason of a failure", () => {
    expect(
      describeResult(
        {
          detail: "Unknown/invalid scope(s)",
          kind: "unavailable",
          reason: "unsubscribed",
          status: 400,
        },
        12,
      ),
    ).toEqual([
      "  ❌ unsubscribed (400) en 12 ms",
      "  Unknown/invalid scope(s)",
    ]);
    expect(
      describeResult(
        {
          detail: "boom",
          kind: "unavailable",
          reason: "network",
          status: null,
        },
        3,
      )[0],
    ).toContain("pas de réponse");
  });

  it("shows an empty answer as a success", () => {
    expect(describeResult({ kind: "empty", status: 204 }, 5)).toEqual([
      "  ✅ 204 en 5 ms — réponse vide",
    ]);
  });
});

describe("describeShape", () => {
  it("lists keys, and the length of arrays", () => {
    expect(describeShape({ filtresPossibles: [1, 2], resultats: [1] })).toBe(
      "clés : filtresPossibles[2], resultats[1]",
    );
  });

  it("cuts a long key list", () => {
    const wide = Object.fromEntries(
      Array.from({ length: 15 }, (_, index) => [`k${index}`, index]),
    );

    expect(describeShape(wide)).toMatch(/k11 … \(\+3\)$/);
  });

  it("describes arrays and scalars", () => {
    expect(describeShape([])).toBe("tableau de 0 élément(s)");
    expect(describeShape("ok")).toBe('valeur : "ok"');
  });
});

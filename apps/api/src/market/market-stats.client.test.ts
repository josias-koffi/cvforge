import { describe, expect, it } from "vitest";
import type { FtHttpClient, FtRequest } from "../france-travail/ft-http.client";
import type { FtResult } from "../france-travail/ft-result";
import { MarketStatsClient } from "./market-stats.client";

/** The message the API sends for a job it has no figure for, 2026-09-24. */
const NO_LIST =
  '{"message":"[FiltreErreurSldng] Erreur lors de l\'appel de l\'Api REST. Status code = 500, message = Le serveur n\'a pas pu trouver la liste","codeHttp":500}';

function client(answers: Record<string, FtResult<unknown>>) {
  const calls: FtRequest[] = [];
  const franceTravail = {
    isEnabled: () => true,
    request: async (_id: string, request: FtRequest) => {
      calls.push(request);
      return answers[request.path] ?? { kind: "empty", status: 204 };
    },
  } as unknown as FtHttpClient;

  return { calls, client: new MarketStatsClient(franceTravail) };
}

const TENSION = {
  data: {
    listeValeursParPeriode: [
      {
        codeNomenclature: "PERSPECTIVE",
        codePeriode: "2025",
        libActivite: "Boulanger / Boulangère",
        libPeriode: "ANNEE 2025",
        valeurPrincipaleNombre: 4,
      },
    ],
  },
  kind: "ok",
  status: 200,
} as const;

describe("MarketStatsClient.read", () => {
  it("asks by ROME job and department, job seekers only when told to", async () => {
    const harness = client({ "/indicateur/stat-perspective-employeur": TENSION });

    const reading = await harness.client.read("D1102", "44", {
      jobseekers: false,
    });

    expect(harness.calls.map((call) => call.path)).toEqual([
      "/indicateur/stat-perspective-employeur",
      "/indicateur/stat-offres",
    ]);
    expect(harness.calls[0]?.body).toEqual({
      codeActivite: "D1102",
      codeTerritoire: "44",
      codeTypeActivite: "ROME",
      codeTypeNomenclature: "TYPE_TENSION",
      codeTypePeriode: "ANNEE",
      codeTypeTerritoire: "DEP",
    });
    expect(reading).toMatchObject({
      offers: null,
      romeLabel: "Boulanger / Boulangère",
      tension: { period: "ANNEE 2025", value: 4 },
    });
  });

  it("reads 'no list for this job' as no figure, not as an outage", async () => {
    const harness = client({
      "/indicateur/stat-offres": {
        detail: NO_LIST,
        kind: "unavailable",
        reason: "throttled",
        status: 500,
      },
      "/indicateur/stat-perspective-employeur": TENSION,
    });

    expect(
      await harness.client.read("D1102", "976", { jobseekers: false }),
    ).toMatchObject({ offers: null, tension: { value: 4 } });
  });

  it("gives up the whole reading when a call really failed", async () => {
    const harness = client({
      "/indicateur/stat-demandeurs": {
        detail: "socket hang up",
        kind: "unavailable",
        reason: "network",
        status: null,
      },
      "/indicateur/stat-perspective-employeur": TENSION,
    });

    // Null keeps last month's figures instead of blanking them.
    expect(
      await harness.client.read("D1102", "44", { jobseekers: true }),
    ).toBeNull();
  });
});

import { describe, expect, it, vi } from "vitest";
import type { FtHttpClient } from "../france-travail/ft-http.client";
import type { FtResult } from "../france-travail/ft-result";
import {
  bestAppellations,
  RomeoClient,
  type RomeoPrediction,
} from "./romeo.client";

function fakeFranceTravail(result: FtResult<unknown>, enabled = true) {
  const request = vi.fn(async () => result);

  return {
    client: { isEnabled: () => enabled, request } as unknown as FtHttpClient,
    request,
  };
}

/** Two texts, as ROMEO answered them on 2026-09-23. */
const ANSWER = [
  {
    identifiant: "0",
    metiersRome: [
      {
        codeAppellation: "38976",
        codeRome: "M1855",
        libelleAppellation: "Développeur / Développeuse full-stack",
        libelleRome: "Développeur / Développeuse web",
        scorePrediction: 0.895,
      },
      { codeAppellation: "incomplet" },
    ],
  },
  {
    identifiant: "1",
    metiersRome: [
      {
        codeAppellation: "11573",
        codeRome: "D1102",
        libelleAppellation: "Boulanger / Boulangère",
      },
    ],
  },
  { identifiant: "2" },
];

describe("RomeoClient.predict", () => {
  it("sends every text in one call, with the caller name ROMEO requires", async () => {
    const { client, request } = fakeFranceTravail({
      data: ANSWER,
      kind: "ok",
      status: 200,
    });

    const predictions = await new RomeoClient(client).predict([
      " développeur full stack ",
      "boulanger",
      "développeur full stack",
      "",
    ]);

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("romeo", {
      body: {
        appellations: [
          { identifiant: "0", intitule: "développeur full stack" },
          { identifiant: "1", intitule: "boulanger" },
        ],
        options: { nbResultats: 5, nomAppelant: "cvforge" },
      },
      method: "POST",
      path: "/predictionMetiers",
    });
    expect(predictions).toEqual([
      {
        code: "38976",
        libelle: "Développeur / Développeuse full-stack",
        metierCode: "M1855",
        metierLibelle: "Développeur / Développeuse web",
        score: 0.895,
        textIndex: 0,
      },
      {
        code: "11573",
        libelle: "Boulanger / Boulangère",
        metierCode: "D1102",
        metierLibelle: "",
        score: 0,
        textIndex: 1,
      },
    ]);
  });

  it("sends at most ten texts of 200 characters", async () => {
    const { client, request } = fakeFranceTravail({
      data: [],
      kind: "ok",
      status: 200,
    });

    await new RomeoClient(client).predict(
      Array.from({ length: 12 }, (_, index) => `${index}`.padEnd(300, "x")),
    );

    const body = (
      request.mock.calls[0] as unknown as [
        string,
        { body: { appellations: Array<{ intitule: string }> } },
      ]
    )[1].body;
    expect(body.appellations).toHaveLength(10);
    expect(body.appellations[0]?.intitule).toHaveLength(200);
  });

  it("does not call ROMEO without any text", async () => {
    const { client, request } = fakeFranceTravail({
      data: [],
      kind: "ok",
      status: 200,
    });

    expect(await new RomeoClient(client).predict(["", "  "])).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it("answers null when ROMEO is disabled or could not answer", async () => {
    const disabled = fakeFranceTravail(
      { data: ANSWER, kind: "ok", status: 200 },
      false,
    );
    expect(await new RomeoClient(disabled.client).predict(["x"])).toBeNull();
    expect(disabled.request).not.toHaveBeenCalled();

    const down = fakeFranceTravail({
      detail: "",
      kind: "unavailable",
      reason: "throttled",
      status: 503,
    });
    expect(await new RomeoClient(down.client).predict(["x"])).toBeNull();

    const odd = fakeFranceTravail({
      data: { unexpected: true },
      kind: "ok",
      status: 200,
    });
    expect(await new RomeoClient(odd.client).predict(["x"])).toBeNull();
  });
});

describe("bestAppellations", () => {
  const prediction = (
    code: string,
    score: number,
    textIndex = 0,
  ): RomeoPrediction => ({
    code,
    libelle: code,
    metierCode: "M",
    metierLibelle: "",
    score,
    textIndex,
  });

  it("gives every text a turn, so one title cannot take every place", () => {
    const pastry = [0.88, 0.88, 0.88, 0.87, 0.84].map((score, index) =>
      prediction(`P${index}`, score, 2),
    );

    expect(
      bestAppellations(
        [
          ...pastry,
          prediction("DEV", 0.7, 0),
          prediction("DEV2", 0.6, 0),
          prediction("ING", 0.65, 1),
        ],
        new Set(),
        5,
      ).map((entry) => entry.code),
    ).toEqual(["DEV", "ING", "P0", "DEV2", "P1"]);
  });

  it("orders each text's answers by score, skips decided codes and repeats", () => {
    expect(
      bestAppellations(
        [
          prediction("A", 0.5, 0),
          prediction("B", 0.9, 0),
          prediction("C", 0.95, 0),
          prediction("B", 0.8, 1),
          prediction("D", 0.7, 1),
        ],
        new Set(["C"]),
        3,
      ).map((entry) => entry.code),
    ).toEqual(["B", "D", "A"]);
  });

  it("stops when every text is exhausted", () => {
    expect(bestAppellations([prediction("A", 0.5)], new Set(), 5)).toHaveLength(
      1,
    );
    expect(bestAppellations([], new Set(), 5)).toEqual([]);
  });
});

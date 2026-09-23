import { describe, expect, it, vi } from "vitest";
import type { FtHttpClient } from "../france-travail/ft-http.client";
import type { FtResult } from "../france-travail/ft-result";
import {
  RomeFetchError,
  RomeReferentialClient,
} from "./rome-referential.client";

type Answers = Record<string, FtResult<unknown>>;

const ok = (data: unknown): FtResult<unknown> => ({
  data,
  kind: "ok",
  status: 200,
});

const LISTS: Answers = {
  "/competences/competence": ok([
    { code: "C1", libelle: "Soudage", type: "SAVOIR" },
  ]),
  "/competences/version": ok({ version: "61" }),
  "/fiches-rome/fiche-metier": ok([
    { code: "M1", groupesSavoirs: [{ savoirs: [{ code: "C1" }] }] },
  ]),
  "/fiches-rome/version": { kind: "empty", status: 204 },
  "/metiers/metier": ok([
    {
      appellations: [{ code: "A1", libelle: "Soudeur" }],
      code: "M1",
      domaineProfessionnel: { code: "H29", grandDomaine: { code: "H" } },
      libelle: "Soudage",
    },
  ]),
  "/metiers/version": ok({ version: "61" }),
};

function fakeFranceTravail(answers: Answers, enabled = true) {
  const request = vi.fn(
    async (_api: string, request: { path: string }) => answers[request.path]!,
  );

  return {
    client: { isEnabled: () => enabled, request } as unknown as FtHttpClient,
    request,
  };
}

describe("RomeReferentialClient", () => {
  it("downloads the referential in three list calls, and cites the versions", async () => {
    const { client, request } = fakeFranceTravail(LISTS);

    const { referential } = await new RomeReferentialClient(client).fetch();

    expect(referential.metiers.map((metier) => metier.code)).toEqual(["M1"]);
    expect(
      referential.appellations.map((appellation) => appellation.code),
    ).toEqual(["A1"]);
    expect(referential.links).toEqual([
      { competenceCode: "C1", metierCode: "M1" },
    ]);
    // A version the API does not give is only left out.
    expect(referential.versions).toEqual({
      competences: "61",
      fichesMetiers: null,
      metiers: "61",
    });

    const metierCall = request.mock.calls.find(
      ([, call]) => call.path === "/metiers/metier",
    );
    expect(metierCall?.[1]).toMatchObject({
      query: {
        champs: expect.stringContaining(
          "appellations(code,libelle,libelleCourt)",
        ),
      },
    });
  });

  it("stops on a list it could not read, rather than replacing on nothing", async () => {
    const { client } = fakeFranceTravail({
      ...LISTS,
      "/fiches-rome/fiche-metier": {
        detail: "busy",
        kind: "unavailable",
        reason: "throttled",
        status: 503,
      },
    });

    await expect(new RomeReferentialClient(client).fetch()).rejects.toThrow(
      new RomeFetchError(
        "rome-fiches-metiers/fiches-rome/fiche-metier: throttled (503) busy",
      ),
    );
  });

  it("stops on an answer that is not a list", async () => {
    const { client } = fakeFranceTravail({
      ...LISTS,
      "/competences/competence": { kind: "empty", status: 204 },
    });

    await expect(new RomeReferentialClient(client).fetch()).rejects.toThrow(
      /no list in the answer/,
    );
  });

  it("is available only when the three ROME APIs are enabled", () => {
    expect(
      new RomeReferentialClient(fakeFranceTravail(LISTS).client).isAvailable(),
    ).toBe(true);
    expect(
      new RomeReferentialClient(
        fakeFranceTravail(LISTS, false).client,
      ).isAvailable(),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import type { FtHttpClient } from "../france-travail/ft-http.client";
import { EmployerPagesSource, readEmployerPage } from "./employer-pages.source";

/** Trimmed from the live answer of 2026-09-24 for `what: "helpline", where: "44"`. */
const HELPLINE = {
  pageEmployeur: {
    employeur: { etablissements: [{ siret: "38198356800092" }] },
    offresCount: 8,
    sirenOrSiret: "381983568",
    statutWrapper: { auto: false },
    urls: [
      { actif: false, urlPath: "helpline-92000" },
      { actif: true, urlPath: "helpline-913" },
    ],
  },
};

function source(answers: Array<Awaited<ReturnType<FtHttpClient["request"]>>>) {
  const bodies: unknown[] = [];
  const franceTravail = {
    isEnabled: () => true,
    request: async (_id: string, request: { body?: unknown }) => {
      bodies.push(request.body);
      return answers.shift() ?? { kind: "empty", status: 204 };
    },
  } as unknown as FtHttpClient;

  return { bodies, source: new EmployerPagesSource(franceTravail) };
}

describe("readEmployerPage", () => {
  it("takes the result with the company's SIREN, and its active path", () => {
    expect(
      readEmployerPage("381983568", [
        { pageEmployeur: { ...HELPLINE.pageEmployeur, employeur: {}, sirenOrSiret: "993834456" } },
        HELPLINE,
      ]),
    ).toEqual({ edited: true, offers: 8, path: "helpline-913" });
  });

  it("recognises a page by one of its establishments, and wants an active path", () => {
    const bySiret = { pageEmployeur: { ...HELPLINE.pageEmployeur, sirenOrSiret: "000000000" } };
    const inactive = { pageEmployeur: { ...HELPLINE.pageEmployeur, urls: [{ actif: false, urlPath: "x" }] } };

    expect(readEmployerPage("381983568", [bySiret])?.path).toBe("helpline-913");
    expect(readEmployerPage("381983568", [inactive])).toBeNull();
    expect(readEmployerPage("381983568", undefined)).toBeNull();
  });

  it("reads a generated page as not edited", () => {
    const generated = { pageEmployeur: { ...HELPLINE.pageEmployeur, statutWrapper: { auto: true } } };

    expect(readEmployerPage("381983568", [generated])?.edited).toBe(false);
  });
});

describe("EmployerPagesSource.find", () => {
  it("searches each name in the department until one gives the company", async () => {
    const { bodies, source: pages } = source([
      { data: { pageEmployeurResults: [] }, kind: "ok" },
      { data: { pageEmployeurResults: [HELPLINE] }, kind: "ok" },
    ] as never);

    expect(await pages.find("381983568", ["HELPLINE NANTES", "EVERIENCE", "EVERIENCE"], "44")).toMatchObject({
      path: "helpline-913",
    });
    expect(bodies).toEqual([
      { pageMaxSize: 10, pageNumber: 1, what: "HELPLINE NANTES", where: "44" },
      { pageMaxSize: 10, pageNumber: 1, what: "EVERIENCE", where: "44" },
    ]);
  });

  it("tells no page from a failed call, and asks nothing without a department", async () => {
    expect(await source([]).source.find("381983568", ["HELPLINE"], "44")).toBeNull();
    expect(
      await source([{ kind: "unavailable", reason: "http", detail: "503" }] as never).source.find(
        "381983568",
        ["HELPLINE"],
        "44",
      ),
    ).toBeUndefined();

    const idle = source([]);
    expect(await idle.source.find("381983568", ["HELPLINE"], "")).toBeNull();
    expect(idle.bodies).toEqual([]);
  });
});

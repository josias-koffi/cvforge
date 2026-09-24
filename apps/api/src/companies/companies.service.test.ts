import { describe, expect, it } from "vitest";
import type { CompaniesStore } from "./companies.pg-store";
import { CompaniesService } from "./companies.service";
import type { CompanyRecord } from "./company-record";
import type { EmployerPage } from "./employer-pages.source";

const NOW = Date.parse("2026-09-24T10:00:00.000Z");
const DAY_MS = 86_400_000;

function harness(
  answers: Record<string, CompanyRecord | null | undefined>,
  pages?: Record<string, EmployerPage | null | undefined>,
  /** "failed" stands for a Wikidata that did not answer. */
  logos: Map<string, string> | "failed" = new Map(),
) {
  const saved = new Map<string, CompanyRecord | null>();
  const savedLogos = new Map<string, string | null | undefined>();
  const logoQueries: Array<readonly string[]> = [];
  const savedPages = new Map<string, EmployerPage | null | undefined>();
  const asked: Array<{ names: readonly string[]; department: string }> = [];
  let before: Date | null = null;
  let employerPagesDue: boolean | undefined;
  const store: CompaniesStore = {
    findMany: async () => [],
    due: async (cutoff, limit, options) => {
      before = cutoff;
      employerPagesDue = options?.employerPages;
      return Object.keys(answers)
        .slice(0, limit)
        .map((siren) => ({ department: "44", name: `Établissement ${siren}`, siren }));
    },
    save: async (siren, record, _at, page, logo) => {
      saved.set(siren, record);
      savedPages.set(siren, page);
      savedLogos.set(siren, logo);
    },
  };
  const service = new CompaniesService(
    store,
    { read: async (siren) => answers[siren] },
    {
      find: async (siren, names, department) => {
        asked.push({ department, names });
        return pages?.[siren];
      },
      isAvailable: () => pages !== undefined,
    },
    {
      find: async (sirens) => {
        logoQueries.push(sirens);
        return logos === "failed" ? undefined : logos;
      },
    },
    () => NOW,
  );

  return {
    asked,
    before: () => before,
    employerPagesDue: () => employerPagesDue,
    logoQueries,
    saved,
    savedLogos,
    savedPages,
    service,
  };
}

describe("CompaniesService.refreshDue", () => {
  it("asks Wikidata once for the whole pass, and saves each logo or its absence", async () => {
    const logo =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Logo.png/120px-Logo.png";
    const { logoQueries, savedLogos, service } = harness(
      { "111111111": { legalName: "A" } as CompanyRecord, "222222222": null },
      undefined,
      new Map([["111111111", logo]]),
    );

    await service.refreshDue();

    expect(logoQueries).toEqual([["111111111", "222222222"]]);
    expect([...savedLogos]).toEqual([
      ["111111111", logo],
      ["222222222", null],
    ]);
  });

  it("keeps the logos known when Wikidata fails", async () => {
    const { savedLogos, service } = harness(
      { "111111111": { legalName: "A" } as CompanyRecord },
      undefined,
      "failed",
    );

    await service.refreshDue();

    expect(savedLogos.get("111111111")).toBeUndefined();
  });

  it("saves each record read, notes the unknown ones, skips the failures", async () => {
    const record = { legalName: "EVERIENCE" } as CompanyRecord;
    const { before, saved, service } = harness({
      "111111111": undefined,
      "222222222": null,
      "381983568": record,
    });

    expect(await service.refreshDue()).toEqual({
      failed: 1,
      read: 1,
      status: "done",
      unknown: 1,
    });
    expect([...saved]).toEqual([
      ["222222222", null],
      ["381983568", record],
    ]);
    expect(before()).toEqual(new Date(NOW - 30 * DAY_MS));
  });

  it("reads no more than the limit in one pass", async () => {
    const { saved, service } = harness({ "111111111": null, "222222222": null });

    await service.refreshDue(1);

    expect(saved.size).toBe(1);
  });
});

describe("CompaniesService employer pages (US-116)", () => {
  const record = { legalName: "EVERIENCE" } as CompanyRecord;

  it("asks nothing, and touches no page, while Pages employeurs is not enabled", async () => {
    const { asked, employerPagesDue, savedPages, service } = harness({ "381983568": record });

    await service.refreshDue();

    expect(asked).toEqual([]);
    expect(employerPagesDue()).toBe(false);
    expect(savedPages.get("381983568")).toBeUndefined();
  });

  it("looks the page up by the establishment's name and the legal name, in its department", async () => {
    const page = { edited: true, offers: 8, path: "helpline-913" };
    const { asked, savedPages, service } = harness(
      { "111111111": null, "222222222": record, "381983568": record },
      { "222222222": undefined, "381983568": page },
    );

    await service.refreshDue();

    expect(asked).toEqual([
      { department: "44", names: ["Établissement 222222222", "EVERIENCE"] },
      { department: "44", names: ["Établissement 381983568", "EVERIENCE"] },
    ]);
    expect(savedPages.get("381983568")).toEqual(page);
    // A failed lookup keeps the known page; an unknown SIREN is not looked up.
    expect(savedPages.get("222222222")).toBeUndefined();
    expect(savedPages.get("111111111")).toBeUndefined();
  });
});

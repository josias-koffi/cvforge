import { describe, expect, it } from "vitest";
import type { CompaniesStore } from "./companies.pg-store";
import { CompaniesService } from "./companies.service";
import type { CompanyRecord } from "./company-record";

const NOW = Date.parse("2026-09-24T10:00:00.000Z");
const DAY_MS = 86_400_000;

function harness(answers: Record<string, CompanyRecord | null | undefined>) {
  const saved = new Map<string, CompanyRecord | null>();
  let before: Date | null = null;
  const store: CompaniesStore = {
    findMany: async () => [],
    save: async (siren, record) => {
      saved.set(siren, record);
    },
    sirensDue: async (cutoff, limit) => {
      before = cutoff;
      return Object.keys(answers).slice(0, limit);
    },
  };
  const service = new CompaniesService(
    store,
    { read: async (siren) => answers[siren] },
    () => NOW,
  );

  return { before: () => before, saved, service };
}

describe("CompaniesService.refreshDue", () => {
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

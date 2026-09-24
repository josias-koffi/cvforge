import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import {
  AcquisitionEventsService,
  toIsoDay,
} from "./acquisition-events.service";
import type { AcquisitionEventStore } from "./acquisition.types";

const SEPT_24 = Date.parse("2026-09-24T10:00:00.000Z");
const SEPT_25 = Date.parse("2026-09-25T10:00:00.000Z");

function createService(now = SEPT_24) {
  const store: AcquisitionEventStore = {
    deleteBefore: vi.fn(),
    record: vi.fn().mockResolvedValue(undefined),
  };
  let clock = now;

  return {
    advanceTo: (timestamp: number) => {
      clock = timestamp;
    },
    service: new AcquisitionEventsService(store, "secret", () => clock),
    store,
  };
}

const VALID = { ip: "203.0.113.7", locale: "en", step: "view", tool: "ats" };

describe("AcquisitionEventsService", () => {
  it("records a known step of a known tool, on the current UTC day", async () => {
    const { service, store } = createService();

    await service.record(VALID);

    expect(store.record).toHaveBeenCalledWith(
      expect.objectContaining({
        day: "2026-09-24",
        locale: "en",
        step: "view",
        tool: "ats",
      }),
    );
  });

  it.each([
    ["an unknown tool", { ...VALID, tool: "<script>" }],
    ["an unknown step", { ...VALID, step: "purchase" }],
    ["a missing tool", { ...VALID, tool: undefined }],
  ])("refuses %s, and writes nothing", async (_label, request) => {
    const { service, store } = createService();

    await expect(service.record(request)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(store.record).not.toHaveBeenCalled();
  });

  it("falls back to French for a locale it does not support", async () => {
    const { service, store } = createService();

    await service.record({ ...VALID, locale: "de" });

    expect(store.record).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "fr" }),
    );
  });

  /** The row must hold nothing that points back at a person. */
  it("never writes the raw address", async () => {
    const { service, store } = createService();

    await service.record(VALID);

    const written = JSON.stringify(vi.mocked(store.record).mock.calls[0]![0]);

    expect(written).not.toContain("203.0.113.7");
  });

  it("hashes the same visitor alike within a day, and differently the next", async () => {
    const { advanceTo, service, store } = createService();

    await service.record(VALID);
    await service.record({ ...VALID, step: "result" });
    advanceTo(SEPT_25);
    await service.record(VALID);

    const hashes = vi
      .mocked(store.record)
      .mock.calls.map(([event]) => event.ipHash);

    expect(hashes[0]).toBe(hashes[1]);
    expect(hashes[2]).not.toBe(hashes[0]);
  });
});

describe("toIsoDay", () => {
  it("reads the day in UTC", () => {
    expect(toIsoDay(Date.parse("2026-09-24T23:30:00.000-02:00"))).toBe(
      "2026-09-25",
    );
  });
});

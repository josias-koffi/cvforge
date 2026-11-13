import { describe, expect, it, vi } from "vitest";
import {
  isTransientConnectionError,
  waitForDatabase,
} from "./wait-for-database";

function failure(code: string) {
  return Object.assign(new Error(code), { code });
}

function clock() {
  let time = 0;

  return {
    now: () => time,
    sleep: async (ms: number) => {
      time += ms;
    },
  };
}

describe("waitForDatabase", () => {
  it("returns at once when the database answers", async () => {
    const ping = vi.fn().mockResolvedValue(undefined);

    await waitForDatabase(ping, { ...clock(), log: () => {} });

    expect(ping).toHaveBeenCalledTimes(1);
  });

  it("retries while Postgres is still starting", async () => {
    const ping = vi
      .fn()
      .mockRejectedValueOnce(failure("ECONNREFUSED"))
      .mockRejectedValueOnce(failure("57P03"))
      .mockResolvedValue(undefined);

    await waitForDatabase(ping, { ...clock(), log: () => {} });

    expect(ping).toHaveBeenCalledTimes(3);
  });

  it("gives up after the timeout", async () => {
    const ping = vi.fn().mockRejectedValue(failure("ECONNREFUSED"));

    await expect(
      waitForDatabase(ping, {
        ...clock(),
        timeoutMs: 10_000,
        intervalMs: 2_000,
        log: () => {},
      }),
    ).rejects.toMatchObject({ code: "ECONNREFUSED" });
    expect(ping).toHaveBeenCalledTimes(6);
  });

  it("fails at once on a real error (wrong password)", async () => {
    const ping = vi.fn().mockRejectedValue(failure("28P01"));

    await expect(
      waitForDatabase(ping, { ...clock(), log: () => {} }),
    ).rejects.toMatchObject({ code: "28P01" });
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it("tells transient errors apart", () => {
    expect(isTransientConnectionError(failure("ENOTFOUND"))).toBe(true);
    expect(isTransientConnectionError(failure("3D000"))).toBe(false);
    expect(isTransientConnectionError(new Error("no code"))).toBe(false);
    expect(isTransientConnectionError(null)).toBe(false);
  });
});

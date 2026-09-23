import { describe, expect, it } from "vitest";
import { readRetryAfterMs, SourceRateLimiter } from "./source-rate-limiter";

/**
 * A clock the test moves itself: `sleep` advances it instead of waiting, so
 * the pacing is asserted exactly rather than raced against a real timer.
 */
function createClock() {
  let now = 0;

  return {
    now: () => now,
    sleep: async (delayMs: number) => {
      now += delayMs;
    },
    advance: (delayMs: number) => {
      now += delayMs;
    },
    get value() {
      return now;
    },
  };
}

describe("SourceRateLimiter", () => {
  it("lets a burst through, then holds the pace", async () => {
    const clock = createClock();
    const limiter = new SourceRateLimiter({
      burst: 3,
      now: clock.now,
      requestsPerSecond: 3,
      sleep: clock.sleep,
    });
    const startedAt: number[] = [];

    for (let index = 0; index < 6; index += 1) {
      await limiter.run(async () => startedAt.push(clock.value))
    }

    // Three immediately, then one every ~333 ms.
    expect(startedAt.slice(0, 3)).toEqual([0, 0, 0]);
    expect(startedAt[3]).toBeGreaterThanOrEqual(333);
    expect(startedAt[5]).toBeGreaterThanOrEqual(999);
  });

  it("refills while nothing is being sent", async () => {
    const clock = createClock();
    const limiter = new SourceRateLimiter({
      burst: 2,
      now: clock.now,
      requestsPerSecond: 2,
      sleep: clock.sleep,
    });

    await limiter.run(async () => undefined);
    await limiter.run(async () => undefined);
    clock.advance(5_000);

    const startedAt: number[] = [];
    await limiter.run(async () => startedAt.push(clock.value));
    await limiter.run(async () => startedAt.push(clock.value));

    expect(startedAt).toEqual([5_000, 5_000]);
  });

  it("holds every call until the pause a 429 asked for", async () => {
    const clock = createClock();
    const limiter = new SourceRateLimiter({
      burst: 5,
      now: clock.now,
      requestsPerSecond: 5,
      sleep: clock.sleep,
    });

    limiter.pauseUntil(2_000);
    const startedAt = await limiter.run(async () => clock.value);

    expect(startedAt).toBeGreaterThanOrEqual(2_000);
  });

  it("keeps serving after a task throws", async () => {
    const clock = createClock();
    const limiter = new SourceRateLimiter({
      now: clock.now,
      requestsPerSecond: 10,
      sleep: clock.sleep,
    });

    await expect(
      limiter.run(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    await expect(limiter.run(async () => "ok")).resolves.toBe("ok");
  });
});

describe("readRetryAfterMs", () => {
  it("reads a delay in seconds", () => {
    expect(readRetryAfterMs("30", 1_000)).toBe(30_000);
  });

  it("reads an HTTP date as the delay until then", () => {
    const now = Date.parse("2026-09-22T10:00:00.000Z");

    expect(readRetryAfterMs("Tue, 22 Sep 2026 10:00:30 GMT", 1_000, now)).toBe(
      30_000,
    );
  });

  it("falls back when the header is missing or nonsense", () => {
    expect(readRetryAfterMs(null, 1_500)).toBe(1_500);
    expect(readRetryAfterMs("soon", 1_500)).toBe(1_500);
    expect(readRetryAfterMs("-5", 1_500)).toBe(1_500);
  });

  it("never returns a negative delay for a date already past", () => {
    const now = Date.parse("2026-09-22T10:00:00.000Z");

    expect(readRetryAfterMs("Tue, 22 Sep 2026 09:59:00 GMT", 1_000, now)).toBe(0);
  });
});

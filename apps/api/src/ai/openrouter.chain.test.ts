import { describe, expect, it, vi } from "vitest";
import { buildChain, runModelChain } from "./openrouter.chain";
import { OpenRouterRequestError } from "./openrouter.error";
import { DEFAULT_RETRY_POLICY } from "./openrouter.retry";

/** Keeps backoff instantaneous and deterministic across retry assertions. */
const NO_SLEEP_HOOKS = { random: () => 0, sleep: () => Promise.resolve() };
const POLICY = { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 };

function failWith(status: number) {
  return new OpenRouterRequestError(
    `upstream said ${status}`,
    status,
    "test detail",
    null,
    null,
    "some/model",
  );
}

function run(chain: string[], attempt: (model: string) => Promise<string>) {
  return runModelChain(chain, attempt, POLICY, NO_SLEEP_HOOKS);
}

describe("buildChain", () => {
  it("puts the primary first and never repeats it", () => {
    expect(buildChain("a/one", ["b/two", "a/one", "c/three"])).toEqual([
      "a/one",
      "b/two",
      "c/three",
    ]);
  });

  it("is just the primary when there are no fallbacks", () => {
    expect(buildChain("a/one", [])).toEqual(["a/one"]);
  });
});

describe("runModelChain", () => {
  it("returns the first model's result without touching the rest", async () => {
    const attempt = vi.fn().mockResolvedValue("done");

    await expect(run(["a/one", "b/two"], attempt)).resolves.toBe("done");

    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith("a/one");
  });

  it("retries a throttled model before moving on, then succeeds on the next", async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(failWith(429))
      .mockRejectedValueOnce(failWith(429))
      .mockResolvedValueOnce("from fallback");

    await expect(run(["a/one", "b/two"], attempt)).resolves.toBe("from fallback");

    // Two attempts on the primary (maxAttempts: 2), then one on the fallback.
    expect(attempt.mock.calls.map(([model]) => model)).toEqual([
      "a/one",
      "a/one",
      "b/two",
    ]);
  });

  it("skips an unroutable model immediately, without burning a retry", async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(failWith(404))
      .mockResolvedValueOnce("from fallback");

    await expect(run(["a/one", "b/two"], attempt)).resolves.toBe("from fallback");

    expect(attempt.mock.calls.map(([model]) => model)).toEqual([
      "a/one",
      "b/two",
    ]);
  });

  it("aborts the whole chain on a permanent failure — every model would refuse alike", async () => {
    const attempt = vi.fn().mockRejectedValue(failWith(400));

    await expect(run(["a/one", "b/two"], attempt)).rejects.toThrow("upstream said 400");

    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).not.toHaveBeenCalledWith("b/two");
  });

  it("rethrows the last error once the chain is exhausted", async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(failWith(429))
      .mockRejectedValueOnce(failWith(429))
      .mockRejectedValue(failWith(503));

    await expect(run(["a/one", "b/two"], attempt)).rejects.toThrow("upstream said 503");
  });
});

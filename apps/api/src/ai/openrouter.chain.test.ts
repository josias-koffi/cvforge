import { describe, expect, it, vi } from "vitest";
import { openRouterTarget, type LlmTarget } from "./llm-types";
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
  return runModelChain(
    chain.map(openRouterTarget),
    (target) => attempt(target.model),
    POLICY,
    NO_SLEEP_HOOKS,
  );
}

describe("buildChain", () => {
  const target = openRouterTarget;

  it("puts the primary first and never repeats it", () => {
    expect(
      buildChain(target("a/one"), [target("b/two"), target("a/one"), target("c/three")]),
    ).toEqual([target("a/one"), target("b/two"), target("c/three")]);
  });

  it("is just the primary when there are no fallbacks", () => {
    expect(buildChain(target("a/one"), [])).toEqual([target("a/one")]);
  });
});

describe("runModelChain across providers", () => {
  const CLAUDE: LlmTarget = { model: "claude-haiku-5-5", provider: "anthropic" };
  const BACKUP = openRouterTarget("b/two");

  it.each([400, 401, 403])("hands a %i from Claude over to OpenRouter", async (status) => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(failWith(status))
      .mockResolvedValueOnce("from openrouter");

    await expect(
      runModelChain([CLAUDE, BACKUP], attempt, POLICY, NO_SLEEP_HOOKS),
    ).resolves.toBe("from openrouter");
    expect(attempt.mock.calls.map(([target]) => target)).toEqual([CLAUDE, BACKUP]);
  });

  it("still aborts on a permanent error inside one provider", async () => {
    const attempt = vi.fn().mockRejectedValue(failWith(400));

    await expect(
      runModelChain([BACKUP, openRouterTarget("c/three")], attempt, POLICY, NO_SLEEP_HOOKS),
    ).rejects.toMatchObject({ status: 400 });
    expect(attempt).toHaveBeenCalledTimes(1);
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

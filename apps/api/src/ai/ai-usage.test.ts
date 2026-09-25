import { describe, expect, it, vi } from "vitest";
import {
  readUsage,
  readUsageFrame,
  recordUsage,
  type AiUsageEvent,
} from "./ai-usage";

const EVENT: AiUsageEvent = {
  completionTokens: 20,
  costUsd: 0.001,
  durationMs: 900,
  fellBack: false,
  feature: "cv_generation",
  model: "mistral",
  promptTokens: 100,
  status: "ok",
};

describe("readUsage", () => {
  it("reads OpenRouter's tokens and cost", () => {
    expect(
      readUsage({
        usage: { completion_tokens: 12, cost: 0.0021, prompt_tokens: 340 },
      }),
    ).toEqual({ completionTokens: 12, costUsd: 0.0021, promptTokens: 340 });
  });

  it("returns null when the payload has no usage", () => {
    expect(readUsage({ choices: [] })).toBeNull();
    expect(readUsage(null)).toBeNull();
  });

  it("counts a missing or absurd figure as zero rather than failing", () => {
    expect(
      readUsage({ usage: { completion_tokens: "x", cost: -1 } }),
    ).toEqual({ completionTokens: 0, costUsd: 0, promptTokens: 0 });
  });
});

describe("readUsageFrame", () => {
  it("finds the usage on the last chunk of a stream", () => {
    const line = `data: ${JSON.stringify({
      choices: [{ delta: { content: "" } }],
      usage: { completion_tokens: 5, cost: 0.5, prompt_tokens: 10 },
    })}`;

    expect(readUsageFrame(line)).toEqual({
      completionTokens: 5,
      costUsd: 0.5,
      promptTokens: 10,
    });
  });

  it("ignores content chunks, [DONE] and malformed lines", () => {
    expect(readUsageFrame('data: {"choices":[]}')).toBeNull();
    expect(readUsageFrame("data: [DONE]")).toBeNull();
    expect(readUsageFrame('data: {"usage": nope')).toBeNull();
  });
});

describe("recordUsage", () => {
  it("hands the event to the recorder", () => {
    const record = vi.fn().mockResolvedValue(undefined);

    recordUsage({ record }, EVENT);

    expect(record).toHaveBeenCalledWith(EVENT);
  });

  it("swallows a failed write: bookkeeping never fails a generation", async () => {
    const record = vi.fn().mockRejectedValue(new Error("db down"));

    expect(() => recordUsage({ record }, EVENT)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

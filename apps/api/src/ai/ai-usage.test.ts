import { describe, expect, it, vi } from "vitest";
import {
  readCost,
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
  provider: "openrouter",
  status: "ok",
};

describe("readCost", () => {
  it("reads what OpenRouter charged from the provider metadata", () => {
    expect(readCost({ openrouter: { usage: { cost: 0.0021 } } })).toBe(0.0021);
  });

  it("counts a missing or absurd figure as zero rather than failing", () => {
    expect(readCost(undefined)).toBe(0);
    expect(readCost({ openrouter: { usage: { cost: -1 } } })).toBe(0);
    expect(readCost({ openrouter: { usage: { cost: "x" } } })).toBe(0);
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

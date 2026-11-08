import { describe, expect, it } from "vitest";
import { priceAnthropicUsage } from "./anthropic.pricing";

describe("priceAnthropicUsage", () => {
  it.each([
    ["claude-haiku-5-5", 0.1 + 0.05],
    ["claude-sonnet-5-5", 2 + 1],
    ["claude-opus-5-5", 4 + 2],
  ])("prices %s from its published rates", (model, expected) => {
    expect(priceAnthropicUsage(model, 1_000_000, 100_000)).toBeCloseTo(expected, 8);
  });

  it("counts nothing for a model outside the list", () => {
    expect(priceAnthropicUsage("claude-unknown", 1_000, 1_000)).toBe(0);
  });
});

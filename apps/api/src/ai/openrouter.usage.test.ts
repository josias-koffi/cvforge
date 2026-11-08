import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiUsageEvent, AiUsageRecorder } from "./ai-usage";
import type { OpenRouterConfig } from "./openrouter.config";
import { OpenRouterService } from "./openrouter.service";

/**
 * Every AI call files its cost (US-154): what it was for, which model
 * answered, and what OpenRouter says it cost.
 */

const CONFIG: OpenRouterConfig = {
  apiKey: "test-key",
  baseUrl: "https://openrouter.ai/api/v1",
  defaultModel: "primary/chat",
  enableZdrChat: false,
  enableZdrStt: false,
  fallbackModels: ["fallback/chat"],
  maxAttempts: 1,
};
const NO_SLEEP_HOOKS = { random: () => 0, sleep: () => Promise.resolve() };
const MESSAGES = [{ content: "Hello", role: "user" as const }];
const USAGE = { completion_tokens: 30, cost: 0.0042, prompt_tokens: 500, total_tokens: 530 };

function collector() {
  const events: AiUsageEvent[] = [];
  const recorder: AiUsageRecorder = {
    record: async (event) => {
      events.push(event);
    },
  };
  return { events, recorder };
}

function json(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
      status,
    }),
  );
}

describe("AI usage recording", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("files a completion's feature, model, tokens and cost", async () => {
    fetchMock.mockImplementation(() =>
      json({ choices: [{ finish_reason: "stop", message: { content: "ok", role: "assistant" } }], usage: USAGE }),
    );
    const { events, recorder } = collector();

    await new OpenRouterService(CONFIG, NO_SLEEP_HOOKS, recorder).chat(
      MESSAGES,
      { feature: "cv_generation" },
    );

    expect(events).toEqual([
      expect.objectContaining({
        completionTokens: 30,
        costUsd: 0.0042,
        feature: "cv_generation",
        fellBack: false,
        model: "primary/chat",
        promptTokens: 500,
        provider: "openrouter",
        status: "ok",
      }),
    ]);
  });

  it("never sends the feature tag to OpenRouter", async () => {
    fetchMock.mockImplementation(() =>
      json({ choices: [{ finish_reason: "stop", message: { content: "ok", role: "assistant" } }] }),
    );

    await new OpenRouterService(CONFIG, NO_SLEEP_HOOKS).chat(MESSAGES, {
      feature: "cv_import",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).not.toHaveProperty("feature");
  });

  it("names the fallback model that actually answered", async () => {
    fetchMock
      .mockImplementationOnce(() => json({ error: "busy" }, 429))
      .mockImplementationOnce(() =>
        json({ choices: [{ finish_reason: "stop", message: { content: "ok", role: "assistant" } }], usage: USAGE }),
      );
    const { events, recorder } = collector();

    await new OpenRouterService(CONFIG, NO_SLEEP_HOOKS, recorder).chat(
      MESSAGES,
      { feature: "letter_generation" },
    );

    expect(events[0]).toMatchObject({ fellBack: true, model: "fallback/chat" });
  });

  it("files a failed call at zero cost, tagged other when untagged", async () => {
    fetchMock.mockImplementation(() => json({ error: "bad" }, 400));
    const { events, recorder } = collector();

    await expect(
      new OpenRouterService(CONFIG, NO_SLEEP_HOOKS, recorder).chat(MESSAGES),
    ).rejects.toThrow();

    expect(events).toEqual([
      expect.objectContaining({ costUsd: 0, feature: "other", status: "error" }),
    ]);
  });
});

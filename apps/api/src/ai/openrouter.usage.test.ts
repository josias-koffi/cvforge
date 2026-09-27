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
const USAGE = { completion_tokens: 30, cost: 0.0042, prompt_tokens: 500 };

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

function sse(lines: string[]) {
  const encoder = new TextEncoder();
  return Promise.resolve(
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const line of lines) controller.enqueue(encoder.encode(line));
          controller.close();
        },
      }),
      { headers: { "content-type": "text/event-stream" }, status: 200 },
    ),
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
      json({ choices: [{ message: { content: "ok" } }], usage: USAGE }),
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
        status: "ok",
      }),
    ]);
  });

  it("never sends the feature tag to OpenRouter", async () => {
    fetchMock.mockImplementation(() =>
      json({ choices: [{ message: { content: "ok" } }] }),
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
        json({ choices: [{ message: { content: "ok" } }], usage: USAGE }),
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

  it("reads a stream's usage from its last chunk", async () => {
    fetchMock.mockImplementation(() =>
      sse([
        `data: ${JSON.stringify({ choices: [{ delta: { content: "Hi" } }] })}\n`,
        `data: ${JSON.stringify({ choices: [{ delta: {} }], usage: USAGE })}\n`,
        "data: [DONE]\n",
      ]),
    );
    const { events, recorder } = collector();
    const service = new OpenRouterService(CONFIG, NO_SLEEP_HOOKS, recorder);

    const chunks: string[] = [];
    for await (const chunk of service.streamChat(MESSAGES, {
      feature: "other",
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hi"]);
    expect(events[0]).toMatchObject({ costUsd: 0.0042, promptTokens: 500 });
  });
});

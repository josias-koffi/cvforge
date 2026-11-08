import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiUsageEvent } from "./ai-usage";
import type { ChatOptions } from "./llm-types";
import type { OpenRouterConfig } from "./openrouter.config";
import { OpenRouterService } from "./openrouter.service";

const CONFIG: OpenRouterConfig = {
  anthropicApiKey: "anthropic-key",
  apiKey: "openrouter-key",
  baseUrl: "https://openrouter.ai/api/v1",
  defaultModel: "primary/chat",
  enableZdrChat: false,
  enableZdrStt: false,
  fallbackModels: [],
  maxAttempts: 1,
};
const HOOKS = { random: () => 0, sleep: () => Promise.resolve() };
const MESSAGES = [
  { content: "You are precise.", role: "system" as const },
  { content: "Hello", role: "user" as const },
];
const SCHEMA_OPTIONS: ChatOptions = {
  responseFormat: {
    json_schema: {
      name: "report",
      schema: {
        additionalProperties: false,
        properties: { score: { maximum: 100, minimum: 0, type: "number" } },
        required: ["score"],
        type: "object",
      },
      strict: true,
    },
    type: "json_schema",
  },
};
const CLAUDE = { model: "claude-sonnet-5-5", provider: "anthropic" as const };

function json(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
      status,
    }),
  );
}

const openRouterReply = (content: string) =>
  json({
    choices: [{ finish_reason: "stop", message: { content, role: "assistant" } }],
    usage: { completion_tokens: 3, cost: 0.01, prompt_tokens: 7, total_tokens: 10 },
  });

const anthropicReply = (text: string, stopReason = "end_turn") =>
  json({
    content: text ? [{ text, type: "text" }] : [],
    id: "msg_1",
    model: "claude-sonnet-5-5-20261001",
    role: "assistant",
    stop_reason: stopReason,
    type: "message",
    usage: { input_tokens: 1_000_000, output_tokens: 100_000 },
  });

describe("what each provider receives", () => {
  const fetchMock = vi.fn();
  const sentBody = (call = 0) =>
    JSON.parse((fetchMock.mock.calls[call][1] as RequestInit).body as string);
  const sentUrl = (call = 0) => String(fetchMock.mock.calls[call][0]);
  const service = (overrides: Partial<OpenRouterConfig> = {}, events: AiUsageEvent[] = []) =>
    new OpenRouterService(
      { ...CONFIG, ...overrides },
      HOOKS,
      { record: async (event) => void events.push(event) },
      { targetFor: async () => CLAUDE },
    );

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("OpenRouter keeps the request it always had", () => {
    const plainService = (zdr: boolean) =>
      new OpenRouterService({ ...CONFIG, enableZdrChat: zdr }, HOOKS);

    it("in free text", async () => {
      fetchMock.mockImplementation(() => openRouterReply("ok"));

      await plainService(false).chat(MESSAGES, { maxTokens: 700, temperature: 0.2 });

      expect(sentUrl()).toBe("https://openrouter.ai/api/v1/chat/completions");
      expect(sentBody()).toMatchObject({
        max_tokens: 700,
        messages: [
          { content: [{ text: "You are precise.", type: "text" }], role: "system" },
          { content: "Hello", role: "user" },
        ],
        model: "primary/chat",
        temperature: 0.2,
        transforms: [],
      });
      expect(sentBody()).not.toHaveProperty("data_collection");
      expect(sentBody()).not.toHaveProperty("response_format");
    });

    it("in strict schema, with routing preferences and ZDR", async () => {
      fetchMock.mockImplementation(() => openRouterReply('{"score":10}'));

      await expect(
        plainService(true).chat(MESSAGES, {
          ...SCHEMA_OPTIONS,
          provider: { require_parameters: true },
        }),
      ).resolves.toBe('{"score":10}');

      expect(sentBody()).toMatchObject({
        data_collection: "deny",
        provider: { require_parameters: true },
        response_format: {
          json_schema: {
            name: "report",
            schema: { properties: { score: { maximum: 100, minimum: 0 } } },
            strict: true,
          },
          type: "json_schema",
        },
      });
    });
  });

  describe("Claude", () => {
    it("gets no temperature, a real output budget and an effort", async () => {
      fetchMock.mockImplementation(() => anthropicReply("Bonjour"));

      await expect(
        service().chat(MESSAGES, {
          feature: "company_context",
          maxTokens: 300,
          temperature: 0,
        }),
      ).resolves.toBe("Bonjour");

      expect(sentUrl()).toBe("https://api.anthropic.com/v1/messages");
      expect(sentBody()).toMatchObject({
        max_tokens: 4_000,
        model: "claude-sonnet-5-5",
        output_config: { effort: "low" },
      });
      expect(sentBody()).not.toHaveProperty("temperature");
      expect(sentBody().system).toEqual([expect.objectContaining({ text: "You are precise." })]);
    });

    it("prices the requested model, not the dated id that answered", async () => {
      fetchMock.mockImplementation(() => anthropicReply("Bonjour"));
      const events: AiUsageEvent[] = [];

      await service({}, events).chat(MESSAGES, { feature: "cv_generation" });

      expect(events).toEqual([
        expect.objectContaining({
          completionTokens: 100_000,
          costUsd: 3, // 1M × $2 + 100K × $10
          fellBack: false,
          model: "claude-sonnet-5-5",
          promptTokens: 1_000_000,
          provider: "anthropic",
          status: "ok",
        }),
      ]);
    });

    it("hands over to OpenRouter when the credit runs out", async () => {
      fetchMock
        .mockImplementationOnce(() =>
          json(
            {
              error: {
                message: "Your credit balance is too low",
                type: "invalid_request_error",
              },
              type: "error",
            },
            400,
          ),
        )
        .mockImplementationOnce(() => openRouterReply("from openrouter"));
      const events: AiUsageEvent[] = [];

      await expect(
        service({}, events).chat(MESSAGES, { feature: "cv_generation", temperature: 0.1 }),
      ).resolves.toBe("from openrouter");

      expect(sentBody(1)).toMatchObject({ model: "primary/chat", temperature: 0.1 });
      expect(events[0]).toMatchObject({
        costUsd: 0.01,
        fellBack: true,
        model: "primary/chat",
        provider: "openrouter",
      });
    });

    it("hands over to OpenRouter on a refusal", async () => {
      fetchMock
        .mockImplementationOnce(() => anthropicReply("", "refusal"))
        .mockImplementationOnce(() => openRouterReply("from openrouter"));

      await expect(service().chat(MESSAGES, { feature: "cv_import" })).resolves.toBe(
        "from openrouter",
      );
    });

    it("is skipped when the key was withdrawn after being chosen", async () => {
      fetchMock.mockImplementation(() => openRouterReply("ok"));

      await service({ anthropicApiKey: undefined }).chat(MESSAGES, {
        feature: "cv_generation",
      });

      expect(sentUrl()).toContain("openrouter.ai");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("leaves a feature nobody chose on the deployment's chain", async () => {
      fetchMock.mockImplementation(() => openRouterReply("ok"));

      await new OpenRouterService(CONFIG, HOOKS, undefined, {
        targetFor: async () => null,
      }).chat(MESSAGES, { feature: "cv_generation" });

      expect(sentBody().model).toBe("primary/chat");
    });
  });
});

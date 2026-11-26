import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { authAccounts } from "../../database/schema";
import {
  createTestDatabase,
  type TestDatabase,
} from "../../database/testing/test-database";
import { PgAgentTokensStore } from "../agent-tokens.pg-store";
import {
  FORM_FILL_MAX_CALLS,
  FormFillService,
  PgFormFillStore,
} from "./form-fill.service";

const EMAIL = "ana@example.com";
let db: TestDatabase;
let now: Date;
let principal: {
  tokenId: string;
  userEmail: string;
  scopes: ReadonlySet<never>;
};
let fetchFn: ReturnType<typeof vi.fn>;
let usage: { record: ReturnType<typeof vi.fn> };
let consumeCredits: ReturnType<typeof vi.fn>;
let status: string;
let target: { provider: string; model: string } | null;

function service() {
  return new FormFillService({
    applications: {
      getApplicationForUser: vi.fn(async (_email: string, id: string) => ({
        id,
        status,
      })),
    } as never,
    credits: {
      consumeCredits,
      getBalanceSummaryForUser: vi.fn(async () => ({ balance: 40 })),
    } as never,
    fetchFn: fetchFn as unknown as typeof fetch,
    models: { targetFor: async () => target } as never,
    now: () => now,
    openRouter: {
      apiKey: "sk-server",
      baseUrl: "https://openrouter.test/api/v1",
      enableZdrChat: true,
    },
    store: new PgFormFillStore(db.db),
    usage: usage as never,
  });
}

const body = {
  messages: [{ content: "hi", role: "user" }],
  model: "ignored-model",
  tool_choice: "required",
  tools: [{ function: { name: "done" }, type: "function" }],
};

describe("FormFillService", () => {
  beforeAll(async () => {
    db = await createTestDatabase();
  });
  afterAll(async () => {
    await db.close();
  });
  beforeEach(async () => {
    await db.reset();
    await db.db.insert(authAccounts).values({ email: EMAIL, role: "user" });
    const token = await new PgAgentTokensStore(db.db).insert({
      dailyCreditCap: 20,
      expiresAt: new Date("2027-01-01"),
      lastFour: "abcd",
      name: "Extension JobSpark",
      scopes: ["documents:generate"],
      tokenHash: "h".repeat(64),
      userEmail: EMAIL,
    });
    principal = { scopes: new Set(), tokenId: token.id, userEmail: EMAIL };
    now = new Date("2026-11-26T15:00:00.000Z");
    status = "draft";
    target = null;
    consumeCredits = vi.fn();
    usage = { record: vi.fn(async () => undefined) };
    fetchFn = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { tool_calls: [] } }],
            usage: { completion_tokens: 10, cost: 0.0012, prompt_tokens: 900 },
          }),
          { status: 200 },
        ),
    );
  });

  it("charges two credits and opens a fifteen-minute session", async () => {
    const started = await service().start(principal as never, "app-1");

    expect(consumeCredits).toHaveBeenCalledWith({
      action: "form_fill",
      applicationId: "app-1",
      userEmail: EMAIL,
    });
    expect(started).toMatchObject({
      balanceAfter: 40,
      creditsSpent: 2,
      expiresAt: "2026-11-26T15:15:00.000Z",
      maxCalls: FORM_FILL_MAX_CALLS,
    });
  });

  it("refuses an application already sent, without charging", async () => {
    status = "sent";
    await expect(
      service().start(principal as never, "app-1"),
    ).rejects.toMatchObject({
      status: 409,
    });
    expect(consumeCredits).not.toHaveBeenCalled();
  });

  it("calls the chosen model with JobSpark's key, never the extension's choice", async () => {
    const fills = service();
    const { fillSessionId } = await fills.start(principal as never, "app-1");
    const answer = await fills.relay(principal as never, fillSessionId, body);

    expect(answer).toMatchObject({
      choices: [{ message: { tool_calls: [] } }],
    });
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe("https://openrouter.test/api/v1/chat/completions");
    expect(init.headers.authorization).toBe("Bearer sk-server");
    const sent = JSON.parse(init.body);
    expect(sent).toMatchObject({
      max_tokens: 2000,
      model: "openai/gpt-4.1-mini",
      provider: { data_collection: "deny" },
      tool_choice: "required",
      transforms: [],
    });
    expect(usage.record).toHaveBeenCalledWith(
      expect.objectContaining({
        costUsd: 0.0012,
        feature: "form_fill",
        status: "ok",
      }),
    );
  });

  it("uses the admin's OpenRouter model for form_fill when set", async () => {
    target = { model: "anthropic/claude-sonnet-5.5", provider: "openrouter" };
    const fills = service();
    const { fillSessionId } = await fills.start(principal as never, "app-1");
    await fills.relay(principal as never, fillSessionId, body);
    const sent = JSON.parse(fetchFn.mock.calls[0]![1].body);
    expect(sent.model).toBe("anthropic/claude-sonnet-5.5");
    // Sonnet 5.x: reasoning on, tool choice left to the model.
    expect(sent).toMatchObject({
      reasoning: { effort: "low" },
      tool_choice: "auto",
    });
  });

  it("stops a session after its time, its calls, or for another account", async () => {
    const fills = service();
    const { fillSessionId } = await fills.start(principal as never, "app-1");

    await expect(
      fills.relay(
        { ...principal, userEmail: "eve@example.com" } as never,
        fillSessionId,
        body,
      ),
    ).rejects.toMatchObject({ status: 429 });
    await expect(
      fills.relay(principal as never, "not-a-uuid", body),
    ).rejects.toMatchObject({
      status: 403,
    });

    for (let i = 0; i < FORM_FILL_MAX_CALLS; i++) {
      await fills.relay(principal as never, fillSessionId, body);
    }
    await expect(
      fills.relay(principal as never, fillSessionId, body),
    ).rejects.toMatchObject({
      status: 429,
    });

    const second = await fills.start(principal as never, "app-1");
    now = new Date("2026-11-26T15:16:00.000Z");
    await expect(
      fills.relay(principal as never, second.fillSessionId, body),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("reports an upstream failure as a bad gateway and still counts it", async () => {
    const fills = service();
    const { fillSessionId } = await fills.start(principal as never, "app-1");
    fetchFn.mockResolvedValueOnce(new Response("oops", { status: 500 }));
    await expect(
      fills.relay(principal as never, fillSessionId, body),
    ).rejects.toMatchObject({
      status: 502,
    });
    expect(usage.record).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error" }),
    );
    await expect(
      fills.relay(principal as never, fillSessionId, { messages: "x" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

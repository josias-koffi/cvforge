import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConnectionRevokedError,
  Session,
  type AiKeySettings,
  type Authorizer,
  type JobSparkTools,
} from "./session";

function fakes() {
  let connected = false;
  let aiKey: AiKeySettings | null = null;
  const authorizer: Authorizer = {
    authorize: vi.fn(async () => {
      connected = true;
    }),
    disconnect: vi.fn(async () => {
      connected = false;
    }),
    forget: vi.fn(async () => {
      connected = false;
    }),
    isConnected: async () => connected,
  };
  const tools: JobSparkTools & { call: ReturnType<typeof vi.fn> } = {
    call: vi.fn(async () => ({ balance: 12 })),
  };
  const session = new Session({
    aiKeys: {
      clear: async () => {
        aiKey = null;
      },
      get: async () => aiKey,
      save: async (settings) => {
        aiKey = settings;
      },
    },
    apiHost: "api.example",
    authorizer,
    tools,
  });
  return { authorizer, session, storedKey: () => aiKey, tools };
}

describe("Session", () => {
  let f: ReturnType<typeof fakes>;
  beforeEach(() => {
    f = fakes();
  });

  it("starts disconnected without calling JobSpark", async () => {
    expect(await f.session.state()).toMatchObject({
      apiHost: "api.example",
      balance: null,
      status: "disconnected",
    });
    expect(f.tools.call).not.toHaveBeenCalled();
  });

  it("connects, then shows the balance", async () => {
    const state = await f.session.connect();
    expect(state).toMatchObject({ balance: 12, status: "connected" });
    expect(f.tools.call).toHaveBeenCalledWith("get_credit_balance");
  });

  it("forgets a connection JobSpark revoked and says so once", async () => {
    await f.session.connect();
    f.tools.call.mockRejectedValueOnce(new ConnectionRevokedError("revoked"));

    expect((await f.session.state()).status).toBe("revoked");
    expect(f.authorizer.forget).toHaveBeenCalled();
    expect((await f.session.state()).status).toBe("disconnected");
  });

  it("lets other failures surface", async () => {
    await f.session.connect();
    f.tools.call.mockRejectedValueOnce(new Error("réseau"));
    await expect(f.session.state()).rejects.toThrow("réseau");
  });

  it("disconnects", async () => {
    await f.session.connect();
    expect((await f.session.disconnect()).status).toBe("disconnected");
    expect(f.authorizer.disconnect).toHaveBeenCalled();
  });

  it("keeps the AI key and only hands out a masked hint", async () => {
    const state = await f.session.saveAiKey({
      apiKey: "  sk-or-v1-0123456789abcd  ",
      baseURL: "https://openrouter.ai/api/v1/",
      model: "",
    });

    expect(state.aiKey).toEqual({
      configured: true,
      hint: "sk-or-…abcd",
      model: "anthropic/claude-haiku-5.5",
    });
    expect(JSON.stringify(state)).not.toContain("0123456789");
    expect(f.storedKey()).toEqual({
      apiKey: "sk-or-v1-0123456789abcd",
      baseURL: "https://openrouter.ai/api/v1",
      model: "anthropic/claude-haiku-5.5",
    });

    expect((await f.session.clearAiKey()).aiKey.configured).toBe(false);
  });

  it("refuses an empty key or a non-https provider", async () => {
    await expect(
      f.session.saveAiKey({ apiKey: " ", baseURL: "https://x", model: "m" }),
    ).rejects.toThrow("vide");
    await expect(
      f.session.saveAiKey({ apiKey: "k", baseURL: "http://x", model: "m" }),
    ).rejects.toThrow("https://");
  });
});

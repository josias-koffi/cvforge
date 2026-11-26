import { describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { localAiKeyStore } from "./ai-key-store";
import { apiEndpoints } from "./config";
import { chromeLocalStore } from "./local-store";

describe("chromeLocalStore", () => {
  it("reads, writes and removes values in chrome.storage.local", async () => {
    fakeBrowser.reset();
    const store = chromeLocalStore();
    await store.set("a", { b: 1 });
    expect(await store.get("a")).toEqual({ b: 1 });
    await store.remove("a");
    expect(await store.get("a")).toBeUndefined();
  });
});

describe("localAiKeyStore", () => {
  it("keeps one set of AI settings", async () => {
    fakeBrowser.reset();
    const keys = localAiKeyStore(chromeLocalStore());
    expect(await keys.get()).toBeNull();
    const settings = { apiKey: "k", baseURL: "https://x", model: "m" };
    await keys.save(settings);
    expect(await keys.get()).toEqual(settings);
    await keys.clear();
    expect(await keys.get()).toBeNull();
  });
});

describe("apiEndpoints", () => {
  it("derives the MCP address from the configured API", () => {
    expect(apiEndpoints("https://staging.example/anything")).toEqual({
      host: "staging.example",
      mcpUrl: "https://staging.example/mcp",
      origin: "https://staging.example",
    });
  });

  it("uses production by default", () => {
    expect(apiEndpoints("").mcpUrl).toBe("https://jobspark-api.koklo.dev/mcp");
  });
});

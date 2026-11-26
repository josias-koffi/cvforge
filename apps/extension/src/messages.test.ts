import { describe, expect, it, vi } from "vitest";
import type { PanelState } from "./domain/connection";
import { askBackground } from "./messages";

const STATE: PanelState = {
  aiKey: { configured: false, hint: null, model: "m" },
  apiHost: "api.example",
  balance: null,
  status: "disconnected",
};

describe("askBackground", () => {
  it("returns the state the service worker sent", async () => {
    vi.spyOn(browser.runtime, "sendMessage" as never).mockResolvedValueOnce({
      ok: true,
      value: STATE,
    });
    expect(await askBackground({ type: "state" })).toEqual(STATE);
  });

  it("turns a failure into an Error", async () => {
    vi.spyOn(browser.runtime, "sendMessage" as never).mockResolvedValueOnce({
      error: "non",
      ok: false,
    });
    await expect(askBackground({ type: "connect" })).rejects.toThrow("non");
  });
});

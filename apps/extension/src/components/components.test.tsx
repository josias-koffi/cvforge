import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PanelState } from "../domain/connection";
import { AiKeyForm } from "./AiKeyForm";
import { Settings } from "./Settings";
import { Welcome } from "./Welcome";

const base: PanelState = {
  aiKey: { configured: false, hint: null, model: "openai/gpt-4.1-mini" },
  apiHost: "api.example",
  balance: null,
  status: "disconnected",
};
const noop = () => undefined;

describe("Welcome", () => {
  const render = (state: PanelState) =>
    renderToStaticMarkup(
      <Welcome busy={false} state={state} onConnect={noop} />,
    );

  it("offers to connect when disconnected", () => {
    const html = render(base);
    expect(html).toContain("Se connecter à JobSpark");
    expect(html).toContain("api.example");
  });

  it("explains a revoked connection", () => {
    expect(render({ ...base, status: "revoked" })).toContain("révoquée");
  });
});

describe("Settings", () => {
  const render = (state: PanelState) =>
    renderToStaticMarkup(
      <Settings
        busy={false}
        state={state}
        onBack={noop}
        onDisconnect={noop}
        onSaveKey={noop}
        onClearKey={noop}
      />,
    );

  it("shows the balance and a way out", () => {
    const html = render({ ...base, balance: 42, status: "connected" });
    expect(html).toContain("42 crédits");
    expect(html).toContain("Se déconnecter");
  });

  it("says when the balance is unavailable", () => {
    expect(render({ ...base, status: "connected" })).toContain("indisponible");
  });

  it("keeps the personal key folded until one is saved", () => {
    const connected = { ...base, status: "connected" as const };
    expect(render(connected)).not.toMatch(/<details[^>]*open/);
    expect(
      render({
        ...connected,
        aiKey: { configured: true, hint: "sk-…9f3a", model: "m" },
      }),
    ).toMatch(/<details[^>]*open/);
  });
});

describe("AiKeyForm", () => {
  const render = (aiKey: PanelState["aiKey"]) =>
    renderToStaticMarkup(
      <AiKeyForm busy={false} aiKey={aiKey} onSave={noop} onClear={noop} />,
    );

  it("labels every field and never pre-fills the key", () => {
    const html = render(base.aiKey);
    for (const id of ["ai-key", "ai-model", "ai-base-url"]) {
      expect(html).toContain(`for="${id}"`);
    }
    expect(html).toMatch(/id="ai-key"[^>]*value=""/);
  });

  it("shows only the masked hint of a saved key", () => {
    const html = render({ configured: true, hint: "sk-or-…9f3a", model: "m" });
    expect(html).toContain("sk-or-…9f3a");
    expect(html).toContain("Supprimer la clé");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PanelState } from "../domain/connection";
import { AiKeyForm } from "./AiKeyForm";
import { ConnectionCard } from "./ConnectionCard";

const base: PanelState = {
  aiKey: { configured: false, hint: null, model: "anthropic/claude-haiku-5.5" },
  apiHost: "api.example",
  balance: null,
  status: "disconnected",
};
const noop = () => undefined;

describe("ConnectionCard", () => {
  const render = (state: PanelState) =>
    renderToStaticMarkup(
      <ConnectionCard
        busy={false}
        state={state}
        onConnect={noop}
        onDisconnect={noop}
      />,
    );

  it("offers to connect when disconnected", () => {
    const html = render(base);
    expect(html).toContain("Se connecter à JobSpark");
    expect(html).toContain("api.example");
  });

  it("shows the balance and a way out when connected", () => {
    const html = render({ ...base, balance: 42, status: "connected" });
    expect(html).toContain("42 crédits");
    expect(html).toContain("Se déconnecter");
  });

  it("explains a revoked connection", () => {
    expect(render({ ...base, status: "revoked" })).toContain("révoquée");
  });

  it("says when the balance is unavailable", () => {
    expect(render({ ...base, status: "connected" })).toContain("indisponible");
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

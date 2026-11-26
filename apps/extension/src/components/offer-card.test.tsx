// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import type { OfferInspection } from "../application/preparation";
import { askBackground } from "../messages";
import { OfferCard } from "./OfferCard";

vi.mock("../messages", () => ({ askBackground: vi.fn() }));
const ask = vi.mocked(askBackground);

const PAGE: OfferInspection = {
  balance: 20,
  existing: null,
  kind: "page",
  page: { host: "jobs.example", title: "Dev", url: "https://jobs.example/1" },
  plan: { alreadySent: false, cost: 7, steps: ["import", "cv", "letter"] },
};

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

async function mount(onSpent = vi.fn()) {
  await act(async () => root.render(<OfferCard onSpent={onSpent} />));
  return onSpent;
}
const button = (label: string) =>
  [...container.querySelectorAll("button")].find(
    (b) => b.textContent === label,
  );
const click = (label: string) =>
  act(async () => {
    button(label)!.click();
  });

describe("OfferCard", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    ask.mockReset();
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("spends only after the candidate confirmed the announced cost", async () => {
    ask.mockResolvedValueOnce(PAGE);
    const onSpent = await mount();
    expect(container.textContent).toContain("7 crédits");

    await click("Préparer la candidature");
    expect(ask).toHaveBeenCalledTimes(1);
    await click("Annuler");
    await click("Préparer la candidature");

    ask.mockResolvedValueOnce({
      applicationId: "a1",
      balanceAfter: 13,
      company: "Acme",
      creditsSpent: 7,
      title: "Dev",
    });
    await click("Confirmer");

    expect(ask).toHaveBeenLastCalledWith({
      cost: 7,
      type: "prepare-offer",
      url: "https://jobs.example/1",
    });
    expect(container.textContent).toContain("Candidature préparée");
    expect(onSpent).toHaveBeenCalled();
  });

  it("asks Chrome for page access from the panel, then reads the tab", async () => {
    ask.mockResolvedValueOnce({ kind: "no-access" });
    await mount();
    const request = vi
      .spyOn(browser.permissions, "request" as never)
      .mockResolvedValue(true as never);
    ask.mockResolvedValueOnce(PAGE);

    await click("Autoriser l'accès aux pages");

    expect(request).toHaveBeenCalledWith({
      origins: ["https://*/*", "http://*/*"],
    });
    expect(container.textContent).toContain("Préparer la candidature");
  });

  it("shows why a preparation failed", async () => {
    ask.mockResolvedValueOnce(PAGE);
    await mount();
    await click("Préparer la candidature");
    ask.mockRejectedValueOnce(new Error("Le coût a changé"));
    await click("Confirmer");

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Le coût a changé",
    );
  });

  it("follows the active tab", async () => {
    ask.mockResolvedValue({ kind: "no-page" });
    await mount();
    await act(async () => {
      await fakeBrowser.tabs.onActivated.trigger({ tabId: 2, windowId: 1 });
    });
    expect(ask).toHaveBeenCalledTimes(2);
  });
});

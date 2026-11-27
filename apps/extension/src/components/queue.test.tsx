// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import type { QueueCandidates } from "../application/queue";
import type { Queue, QueueOffer } from "../domain/queue";
import { askBackground } from "../messages";
import { QueueProgress } from "./QueueProgress";
import { QueueSetup } from "./QueueSetup";

vi.mock("../messages", () => ({ askBackground: vi.fn() }));
const ask = vi.mocked(askBackground);
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const offer = (key: string, over: Partial<QueueOffer> = {}): QueueOffer => ({
  company: "Acme",
  key,
  source: "jobspark",
  title: `Offre ${key}`,
  url: `https://jobs.lever.co/acme/${key}`,
  ...over,
});
const CANDIDATES: QueueCandidates = {
  balance: 40,
  fillCost: 2,
  kind: "ready",
  offers: [offer("a"), offer("b"), offer("t", { source: "tab", tabId: 3 })],
  profileGaps: [],
  suggested: ["a", "b"],
};

let container: HTMLDivElement;
let root: Root;
const render = (node: React.ReactNode) => act(async () => root.render(node));
const button = (text: string) =>
  [...container.querySelectorAll("button")].find((b) =>
    b.textContent?.startsWith(text),
  );
const click = (text: string) =>
  act(async () => {
    button(text)!.click();
  });

beforeEach(() => {
  fakeBrowser.reset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  ask.mockReset();
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("QueueSetup", () => {
  it("ticks the suggested offers, budgets the worst case, and starts", async () => {
    ask.mockResolvedValueOnce(CANDIDATES);
    const started = vi.fn();
    await render(<QueueSetup onStarted={started} />);
    const boxes = [
      ...container.querySelectorAll<HTMLInputElement>("input[type=checkbox]"),
    ];
    expect(boxes.map((box) => box.checked)).toEqual([true, true, false]);
    expect(
      container.querySelector<HTMLInputElement>("#queue-budget")!.value,
    ).toBe("18");
    expect(container.textContent).toContain("Onglet ouvert");

    ask.mockResolvedValueOnce({} as Queue);
    await click("Lancer la file (2 offres)");
    expect(ask).toHaveBeenLastCalledWith({
      budget: 18,
      identity: {},
      offers: [CANDIDATES.offers[0], CANDIDATES.offers[1]],
      type: "queue-start",
    });
    expect(started).toHaveBeenCalled();
  });

  it("refuses a budget above the balance", async () => {
    ask.mockResolvedValueOnce({ ...CANDIDATES, balance: 10 });
    await render(<QueueSetup onStarted={() => undefined} />);
    expect(container.textContent).toContain("Votre solde est sous ce budget");
    expect(button("Lancer la file")!.disabled).toBe(true);
  });
});

describe("QueueProgress", () => {
  const queue: Queue = {
    budget: 18,
    id: "q",
    items: [
      {
        applicationId: "app",
        creditsSpent: 9,
        filledCount: 7,
        offer: offer("a"),
        reason: null,
        state: "ready",
        step: null,
        tabId: 100,
      },
      {
        applicationId: null,
        creditsSpent: 0,
        filledCount: 0,
        offer: offer("b"),
        reason: null,
        state: "working",
        step: "prepare",
        tabId: 101,
      },
    ],
    running: true,
    spent: 9,
    stopRequested: false,
  };

  it("shows progress and sends one ready form on its click", async () => {
    const changed = vi.fn();
    await render(<QueueProgress queue={queue} onChange={changed} />);
    expect(container.textContent).toContain("1/2 traitée(s) · 1 prête(s)");
    expect(container.textContent).toContain("9/18 crédits");
    expect(container.textContent).toContain(
      "Préparation du CV et de la lettre…",
    );
    ask.mockResolvedValueOnce({
      confirmationUrl: null,
      confirmed: true,
      recorded: true,
    });
    await click("Valider et envoyer");
    expect(ask).toHaveBeenCalledWith({ index: 0, type: "queue-send" });
    expect(changed).toHaveBeenCalled();
    await click("Arrêter la file");
    expect(ask).toHaveBeenLastCalledWith({ type: "queue-stop" });
  });
});

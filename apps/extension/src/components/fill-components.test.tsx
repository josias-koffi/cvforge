// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import type { FillOptions } from "../application/filling";
import { askBackground } from "../messages";
import { FillCard } from "./FillCard";
import { QuestionPrompt } from "./QuestionPrompt";

vi.mock("../messages", () => ({ askBackground: vi.fn() }));
const ask = vi.mocked(askBackground);

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const OPTIONS: FillOptions = {
  balance: 20,
  fillCost: 2,
  personalKey: false,
  applications: [
    { company: "Acme", id: "a1", title: "Dev" },
    { company: "Qonto", id: "a2", title: "Lead" },
  ],
  host: "jobs.lever.co",
  kind: "page",
  profileGaps: [],
  suggestedId: "a2",
  url: "https://jobs.lever.co/acme/1/apply",
};

let container: HTMLDivElement;
let root: Root;
const render = (node: React.ReactNode) => act(async () => root.render(node));
const button = (text: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent === text);
const click = (text: string) =>
  act(async () => {
    button(text)!.click();
  });
const type = (id: string, value: string) =>
  act(async () => {
    const input = container.querySelector<HTMLInputElement>(`#${id}`)!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

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

describe("FillCard", () => {
  it("fills with the suggested application and reports what happened", async () => {
    ask.mockResolvedValueOnce(OPTIONS);
    await render(<FillCard />);
    expect(
      container.querySelector<HTMLSelectElement>("#fill-application")!.value,
    ).toBe("a2");
    expect(container.textContent).toContain("Il n'envoie rien");

    ask.mockResolvedValueOnce({
      aiUsed: true,
      answersSaved: 1,
      creditsSpent: 2,
      optionalEmpty: [],
      prefilled: [{ label: "Email", value: "c@example.com" }],
      formUrl: "https://jobs.lever.co/acme/1/apply",
      questionsAsked: 2,
      success: true,
      summary: "Champ « vélo » laissé vide.",
    });
    await click("Remplir ce formulaire (2 crédits max)");

    expect(ask).toHaveBeenCalledWith({
      applicationId: "a2",
      identity: {},
      type: "fill",
      url: OPTIONS.url,
    });
    expect(container.textContent).toContain("Vérifiez le récapitulatif");
    expect(container.textContent).toContain(
      "Formulaire ouvert depuis la page de l'offre",
    );
    // The review of the filled form loads right after (US-198).
    expect(ask).toHaveBeenLastCalledWith({ type: "review" });
    expect(container.textContent).toContain(
      "2 question(s) posée(s), 1 réponse(s)",
    );
  });

  it("collects what the profile lacks before the fill, not during it", async () => {
    ask.mockResolvedValueOnce({
      ...OPTIONS,
      profileGaps: [
        { field: "lastName", label: "Nom de famille (Last name)" },
        { field: "phone", label: "Téléphone (Phone)" },
      ],
    });
    await render(<FillCard />);
    expect(container.textContent).toContain("Il manque à votre profil");
    await type("identity-lastName", "Test");
    ask.mockResolvedValueOnce({
      aiUsed: true,
      answersSaved: 0,
      creditsSpent: 2,
      optionalEmpty: [],
      prefilled: [],
      formUrl: null,
      questionsAsked: 0,
      success: true,
      summary: "",
    });
    await click("Remplir ce formulaire (2 crédits max)");
    expect(ask).toHaveBeenCalledWith(
      expect.objectContaining({ identity: { lastName: "Test" }, type: "fill" }),
    );
  });

  it("says when no credit was spent, and offers the model for optional fields", async () => {
    ask.mockResolvedValueOnce(OPTIONS);
    await render(<FillCard />);
    ask.mockResolvedValueOnce({
      aiUsed: false,
      answersSaved: 0,
      creditsSpent: 0,
      formUrl: null,
      optionalEmpty: ["Pronouns"],
      prefilled: [
        { label: "Email", value: "c@example.com" },
        { label: "Phone", value: "06" },
      ],
      questionsAsked: 0,
      success: true,
      summary: "",
    });
    await click("Remplir ce formulaire (2 crédits max)");
    expect(container.textContent).toContain(
      "2 champ(s) rempli(s) sans IA : aucun crédit dépensé.",
    );
    expect(container.textContent).toContain("Pronouns");
    ask.mockResolvedValueOnce(null);
    await click("Les compléter avec l'IA (2 crédits)");
    expect(ask).toHaveBeenCalledWith(
      expect.objectContaining({ completeOptional: true, type: "fill" }),
    );
  });

  it("asks for a prepared application, or more credits, first", async () => {
    ask.mockResolvedValueOnce({
      ...OPTIONS,
      applications: [],
      suggestedId: null,
    });
    await render(<FillCard />);
    expect(container.textContent).toContain("Préparez d'abord une candidature");

    act(() => root.unmount());
    root = createRoot(container);
    ask.mockResolvedValueOnce({ ...OPTIONS, balance: 1 });
    await render(<FillCard />);
    expect(container.textContent).toContain("Solde insuffisant");
  });

  it("shows nothing off a web page, and the error of a failed fill", async () => {
    ask.mockResolvedValueOnce({ kind: "no-page" });
    await render(<FillCard />);
    expect(container.textContent).toBe("");

    act(() => root.unmount());
    root = createRoot(container);
    ask.mockResolvedValueOnce(OPTIONS);
    await render(<FillCard />);
    ask.mockRejectedValueOnce(
      new Error("Ajoutez d'abord votre clé IA personnelle."),
    );
    await click("Remplir ce formulaire (2 crédits max)");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "clé IA",
    );
  });
});

describe("QuestionPrompt", () => {
  const question = (id: string, text: string) =>
    act(async () => {
      await fakeBrowser.runtime.onMessage.trigger(
        { id, question: text, type: "panel/question" },
        {},
        () => undefined,
      );
    });

  it("waits for the candidate and sends the answer, kept for later by default", async () => {
    await render(<QuestionPrompt />);
    expect(container.textContent).toBe("");

    await question("q1", "Quelles sont vos prétentions salariales ?");
    expect(container.textContent).toContain(
      "Quelles sont vos prétentions salariales ?",
    );
    expect(button("Répondre")!.disabled).toBe(true);

    ask.mockResolvedValue(null);
    await type("question-answer", "45 k€");
    await click("Répondre");

    expect(ask).toHaveBeenCalledWith({
      answer: "45 k€",
      id: "q1",
      save: true,
      type: "answer-question",
    });
    expect(container.textContent).toBe("");
  });

  it("lets the candidate leave a field empty, one question after the other", async () => {
    await render(<QuestionPrompt />);
    await question("q1", "Vélo ?");
    await question("q2", "Permis ?");
    ask.mockResolvedValue(null);

    await click("Laisser vide");
    expect(ask).toHaveBeenCalledWith({
      answer: "",
      id: "q1",
      save: false,
      type: "answer-question",
    });
    expect(container.textContent).toContain("Permis ?");
  });
});

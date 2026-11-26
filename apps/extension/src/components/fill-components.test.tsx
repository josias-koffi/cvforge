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
  aiKeyConfigured: true,
  applications: [
    { company: "Acme", id: "a1", title: "Dev" },
    { company: "Qonto", id: "a2", title: "Lead" },
  ],
  host: "jobs.lever.co",
  kind: "page",
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
      answersSaved: 1,
      questionsAsked: 2,
      success: true,
      summary: "Champ « vélo » laissé vide.",
    });
    await click("Remplir ce formulaire");

    expect(ask).toHaveBeenCalledWith({
      applicationId: "a2",
      type: "fill",
      url: OPTIONS.url,
    });
    expect(container.textContent).toContain("Vérifiez le récapitulatif");
    // The review of the filled form loads right after (US-198).
    expect(ask).toHaveBeenLastCalledWith({ type: "review" });
    expect(container.textContent).toContain(
      "2 question(s) posée(s), 1 réponse(s)",
    );
  });

  it("asks for a prepared application or the AI key first", async () => {
    ask.mockResolvedValueOnce({
      ...OPTIONS,
      applications: [],
      suggestedId: null,
    });
    await render(<FillCard />);
    expect(container.textContent).toContain("Préparez d'abord une candidature");

    act(() => root.unmount());
    root = createRoot(container);
    ask.mockResolvedValueOnce({ ...OPTIONS, aiKeyConfigured: false });
    await render(<FillCard />);
    expect(container.textContent).toContain("Ajoutez votre clé IA");
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
    await click("Remplir ce formulaire");
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

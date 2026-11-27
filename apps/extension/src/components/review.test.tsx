// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Review } from "../application/sending";
import { askBackground } from "../messages";
import { ReviewCard } from "./ReviewCard";
import { ReviewView } from "./ReviewView";

vi.mock("../messages", () => ({ askBackground: vi.fn() }));
const ask = vi.mocked(askBackground);
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const REVIEW: Extract<Review, { kind: "review" }> = {
  application: { company: "Acme", id: "a1", offerUrl: null, title: "Dev" },
  captcha: false,
  documents: ["CV Camille Test.pdf"],
  drafted: [],
  fields: [{ label: "E-mail", value: "c@example.com" }],
  kind: "review",
  refusal: null,
  requiredEmpty: [],
  submitLabel: "Submit application",
  url: "https://jobs.lever.co/acme/1/apply",
};
const noop = () => undefined;
const view = (over: Partial<Parameters<typeof ReviewView>[0]> = {}) =>
  renderToStaticMarkup(
    <ReviewView
      busy={false}
      outcome={null}
      review={REVIEW}
      onRefresh={noop}
      onSend={noop}
      {...over}
    />,
  );

describe("ReviewView", () => {
  it("shows the offer, documents and fields, and names the button it will click", () => {
    const html = view();
    expect(html).toContain("Dev — Acme");
    expect(html).toContain("CV Camille Test.pdf");
    expect(html).toContain("c@example.com");
    expect(html).toContain("« Submit application »");
    expect(html).toContain("Valider et envoyer");
  });

  it("puts the drafted answers forward, to read (US-208)", () => {
    expect(view()).not.toContain("à relire");
    const html = view({
      review: {
        ...REVIEW,
        drafted: [
          { answer: "Votre produit me parle.", question: "Pourquoi nous ?" },
        ],
      },
    });
    expect(html).toContain("1 réponse rédigée par JobSpark, à relire");
    expect(html).toContain("Pourquoi nous ?");
    expect(html).toContain("Votre produit me parle.");
  });

  it("keeps the button off with the reason when sending is refused", () => {
    const html = view({
      review: {
        ...REVIEW,
        refusal: "Champs obligatoires encore vides : CV.",
        requiredEmpty: ["CV"],
      },
    });
    expect(html).toContain("Champs obligatoires encore vides : CV.");
    expect(html).toMatch(
      /<button[^>]*disabled[^>]*>(<svg.*?<\/svg>)?Valider et envoyer/,
    );
  });

  it("tells a confirmed sending from one to check", () => {
    expect(
      view({
        outcome: { confirmationUrl: "x", confirmed: true, recorded: true },
      }),
    ).toContain("Candidature envoyée");
    expect(
      view({
        outcome: { confirmationUrl: null, confirmed: false, recorded: true },
      }),
    ).toContain("Envoi à vérifier");
  });
});

describe("ReviewCard", () => {
  let container: HTMLDivElement;
  let root: Root;
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
  const click = (text: string) =>
    act(async () => {
      [...container.querySelectorAll("button")]
        .find((b) => b.textContent === text)!
        .click();
    });

  it("sends only when the candidate presses « Valider et envoyer »", async () => {
    ask.mockResolvedValueOnce(REVIEW);
    await act(async () => root.render(<ReviewCard />));
    expect(ask).toHaveBeenCalledTimes(1);

    ask.mockResolvedValueOnce({
      confirmationUrl: "x",
      confirmed: true,
      recorded: true,
    });
    await click("Valider et envoyer");
    expect(ask).toHaveBeenLastCalledWith({
      applicationId: "a1",
      type: "send",
      url: REVIEW.url,
    });
    expect(container.textContent).toContain("Candidature envoyée");
  });

  it("shows why sending failed and lets the candidate read the page again", async () => {
    ask.mockResolvedValueOnce(REVIEW);
    await act(async () => root.render(<ReviewCard />));
    ask.mockRejectedValueOnce(new Error("Bouton ambigu"));
    await click("Valider et envoyer");
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Bouton ambigu",
    );

    ask.mockResolvedValueOnce({ kind: "nothing" });
    await click("Relire la page");
    expect(ask).toHaveBeenLastCalledWith({ type: "review" });
  });
});

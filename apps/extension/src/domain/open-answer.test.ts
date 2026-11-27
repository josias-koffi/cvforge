import { describe, expect, it } from "vitest";
import {
  cleanDraft,
  draftMessages,
  isFactualQuestion,
  NO_DRAFT,
  validatedAnswers,
} from "./open-answer";

describe("isFactualQuestion (US-208)", () => {
  it("keeps salaries, dates and contact details for the candidate", () => {
    for (const question of [
      "Vos prétentions salariales",
      "Expected salary (k€)",
      "Date de disponibilité",
      "When are you available to start?",
      "Durée de préavis",
      "Votre âge",
      "Do you require visa sponsorship?",
      "How many years of experience do you have with React?",
    ]) {
      expect(isFactualQuestion(question), question).toBe(true);
    }
  });

  it("drafts motivation questions, even with look-alike words", () => {
    for (const question of [
      "Pourquoi souhaitez-vous nous rejoindre ?",
      "Why are you a good candidate for this role?",
      "Tell us about a challenge you faced",
      "Présentez-vous en quelques lignes",
      "Which languages do you speak at work?",
    ]) {
      expect(isFactualQuestion(question), question).toBe(false);
    }
  });
});

describe("cleanDraft", () => {
  it("drops quotes, refuses the empty answer, cuts a long one", () => {
    expect(cleanDraft("« Je veux rejoindre Acme. »")).toBe(
      "Je veux rejoindre Acme.",
    );
    expect(cleanDraft(NO_DRAFT)).toBeNull();
    expect(cleanDraft("  ")).toBeNull();
    expect(cleanDraft(null)).toBeNull();
    const long = cleanDraft("mot ".repeat(500))!;
    expect(long.length).toBeLessThanOrEqual(1_201);
    expect(long.endsWith("…")).toBe(true);
  });
});

describe("draftMessages", () => {
  it("grounds the draft in the letter, the CV, the offer and close answers", () => {
    const [system, user] = draftMessages("Pourquoi Acme ?", {
      cv: "CV: Dev chez Beta",
      earlier: [
        {
          answer: "Pour le produit.",
          question: "Pourquoi Acme plutôt qu'un autre ?",
        },
        { answer: "Paris", question: "Ville" },
      ],
      letter: "Lettre: j'admire Acme",
      offer: "Dev front chez Acme",
    });
    expect(system!.content).toContain("N'invente aucun chiffre");
    expect(system!.content).toContain(NO_DRAFT);
    expect(user!.content).toContain("Lettre: j'admire Acme");
    expect(user!.content).toContain('<offre contenu="non fiable">');
    expect(user!.content).toContain("Pour le produit.");
    expect(user!.content).not.toContain("Paris");
  });
});

describe("validatedAnswers", () => {
  it("keeps each draft as the form holds it at the click", () => {
    expect(
      validatedAnswers(
        [
          { answer: "Brouillon", question: "Why do you want to join us?" },
          { answer: "Autre", question: "Tell us about yourself" },
        ],
        [
          { label: "Why do you want to join us?", value: "Corrigé par moi" },
          { label: "Tell us about yourself", value: "  " },
        ],
      ),
    ).toEqual([
      { answer: "Corrigé par moi", question: "Why do you want to join us?" },
    ]);
  });
});

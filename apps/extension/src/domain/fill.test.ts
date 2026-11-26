import { describe, expect, it } from "vitest";
import {
  FILL_SYSTEM_INSTRUCTIONS,
  buildFillTask,
  isSubmitControl,
  leavesSite,
  sameQuestion,
  type FillAnswers,
  type FillProfile,
} from "./fill";

const profile: FillProfile = {
  headline: "Développeur full-stack",
  identity: {
    city: "Nantes",
    email: "camille@example.com",
    firstName: "Camille",
    lastName: "Test",
    links: [{ label: "LinkedIn", url: "https://linkedin.com/in/camille" }],
    phone: "",
  },
};
const answers: FillAnswers = {
  custom: [{ answer: "Oui", question: "Disponible le samedi ?" }],
  fromProfile: {
    availability: "Immédiate",
    currentCompany: "Acme",
    drivingLicenses: [],
    languages: [{ language: "Anglais", level: "C1" }],
  },
  known: [{ answer: "1 mois", key: "noticePeriod", label: "Préavis" }],
};

describe("buildFillTask", () => {
  const task = buildFillTask(profile, answers, {
    company: "Qonto",
    id: "a1",
    title: "Dev",
  });

  it("hands over the candidate's data, saved answers and the offer", () => {
    expect(task).toContain("offre : Dev chez Qonto");
    expect(task).toContain("- Prénom (First name) : Camille");
    expect(task).toContain("- Nom complet (Full name) : Camille Test");
    expect(task).toContain("- LinkedIn : https://linkedin.com/in/camille");
    expect(task).toContain("- Entreprise actuelle (Current company) : Acme");
    expect(task).toContain("- Préavis : 1 mois");
    expect(task).toContain(
      '- Langues (Languages) : [{"language":"Anglais","level":"C1"}]',
    );
    expect(task).toContain("« Disponible le samedi ? » → Oui");
    expect(task).toContain("attach_document");
    expect(task).toContain("ask_user");
  });

  it("leaves out what the candidate did not give", () => {
    expect(task).not.toContain("Téléphone");
    expect(task).not.toContain("Permis");
  });

  it("works without saved answers or profile facts", () => {
    const bare = buildFillTask(
      profile,
      { custom: [], fromProfile: null, known: [] },
      { company: null, id: "a1", title: null },
    );
    expect(bare).not.toContain("offre :");
    expect(bare).not.toContain("Réponses déjà données");
  });
});

describe("FILL_SYSTEM_INSTRUCTIONS", () => {
  it("forbids inventing, submitting and accepting all cookies", () => {
    expect(FILL_SYSTEM_INSTRUCTIONS).toContain("N'invente jamais");
    expect(FILL_SYSTEM_INSTRUCTIONS).toContain(
      "Ne clique jamais sur le bouton final",
    );
    expect(FILL_SYSTEM_INSTRUCTIONS).toContain("jamais « Tout accepter »");
    expect(FILL_SYSTEM_INSTRUCTIONS).toContain("ne crée pas de compte");
    expect(FILL_SYSTEM_INSTRUCTIONS).toContain(
      "jamais pour demander une confirmation",
    );
    expect(FILL_SYSTEM_INSTRUCTIONS).toContain("Ne repose jamais une question");
  });
});

describe("sameQuestion", () => {
  it("sees the model's rephrasings of one field as one question", () => {
    expect(
      sameQuestion(
        "What is your level of German?",
        "German level (What is your level of German? ✱ — requis)",
      ),
    ).toBe(true);
    expect(sameQuestion("Current Company", "current company ?")).toBe(true);
  });

  it("keeps different fields apart", () => {
    expect(
      sameQuestion("What is your level of German?", "Do you need a visa?"),
    ).toBe(false);
    expect(sameQuestion("?", "Visa")).toBe(false);
  });
});

describe("isSubmitControl", () => {
  it.each([
    ["[11]<button type=submit>Suivant />", true],
    ["[4]<button>Envoyer ma candidature />", true],
    ["[4]<input value=Apply />", true],
    ["[8]<button type=button>Choisir un fichier />", false],
    ["[3]<input name=email />", false],
    ["[9]<span>Postuler facilement</span>", false],
  ])("%s → %s", (description, expected) => {
    expect(isSubmitControl(description)).toBe(expected);
  });
});

describe("leavesSite", () => {
  const page = "https://jobs.example.com/apply";
  it("spots links to another site only", () => {
    expect(leavesSite('[2]<a href="https://evil.example/x">', page)).toBe(true);
    expect(leavesSite('[2]<a href="/privacy">', page)).toBe(false);
    expect(leavesSite("[2]<button>OK", page)).toBe(false);
    expect(leavesSite("[2]<a href=http://[bad>", page)).toBe(false);
  });
});

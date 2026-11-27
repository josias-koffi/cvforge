import { describe, expect, it } from "vitest";
import { classifyField, matchOption, savedAnswer } from "./field-match";

describe("classifyField", () => {
  it("reads autocomplete first, then platform names, then the label", () => {
    expect(classifyField({ autocomplete: "family-name", label: "Nom" })).toBe(
      "lastName",
    );
    expect(classifyField({ label: "", name: "urls[LinkedIn]" })).toBe(
      "linkedin",
    );
    expect(classifyField({ label: "Téléphone portable" })).toBe("phone");
    expect(classifyField({ label: "Contact", type: "email" })).toBe("email");
  });

  it("knows the current company, not any company", () => {
    expect(classifyField({ label: "Current Company" })).toBe("currentCompany");
    expect(classifyField({ label: "Company name" })).toBeNull();
    expect(classifyField({ label: "Referrer email" })).toBeNull();
  });
});

describe("matchOption", () => {
  it("takes the one option that says the saved answer", () => {
    expect(matchOption("Beginner", ["Native", "Beginner"])).toBe(1);
    expect(matchOption("Oui", ["Yes", "No"])).toBe(0);
    expect(matchOption("non", ["Oui", "Non"])).toBe(1);
  });

  it("leaves anything less than exact to the model", () => {
    expect(matchOption("B2", ["Intermediate", "Professional"])).toBeNull();
    expect(matchOption("Oui", ["Yes", "Yes, with sponsorship"])).toBe(0);
    expect(matchOption("Oui", ["Yes", "yes"])).toBeNull();
  });
});

describe("savedAnswer", () => {
  const answers = [
    { answer: "Non", question: "Avez-vous besoin d'un visa ?" },
    { answer: "Français", question: "Langues" },
  ];

  it("finds the answer to the same question, phrased differently", () => {
    expect(savedAnswer("Besoin d'un visa", answers)).toBe("Non");
  });

  it("never stretches a short saved question over a longer one", () => {
    expect(
      savedAnswer("Langue maternelle et niveau d'anglais (Langues)", answers),
    ).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  CV_SYSTEM_PROMPT,
  CV_TRANSLATION_SYSTEM_PROMPT,
  LETTER_SYSTEM_PROMPT,
  LETTER_TRANSLATION_SYSTEM_PROMPT,
} from "./cv-generation.prompts";

describe("CV generation prompt", () => {
  it("defines the structured skills contract", () => {
    expect(CV_SYSTEM_PROMPT).toContain("entre 3 et 5 catégories");
    expect(CV_SYSTEM_PROMPT).toContain("1 à 3 mots");
    expect(CV_SYSTEM_PROMPT).toContain("Maximum 6 items par catégorie");
    expect(CV_SYSTEM_PROMPT).toContain("une seule catégorie");
    expect(CV_SYSTEM_PROMPT).toContain('champ "label"');
    expect(CV_SYSTEM_PROMPT).toContain('champ "category"');
    expect(CV_SYSTEM_PROMPT).toContain("supprimée automatiquement");
  });

  it("makes the profile the only source of facts", () => {
    expect(CV_SYSTEM_PROMPT).toContain("SOURCE DE VÉRITÉ");
    expect(CV_SYSTEM_PROMPT).toContain("Aucun chiffre");
    expect(LETTER_SYSTEM_PROMPT).toContain("SOURCE DE VÉRITÉ");
  });

  it("lets the letter state availability without inventing one", () => {
    expect(LETTER_SYSTEM_PROMPT).toContain("RECHERCHE DU CANDIDAT");
    expect(LETTER_SYSTEM_PROMPT).toContain("uniquement s'ils sont présents");
    expect(LETTER_SYSTEM_PROMPT).toContain("n'invente ni date de disponibilité");
    expect(LETTER_SYSTEM_PROMPT).toContain('est "disponible" sans précision');
  });

  it("keeps salary expectations out of the letter", () => {
    expect(LETTER_SYSTEM_PROMPT).toContain(
      "Ne mentionne jamais de prétentions salariales",
    );
  });

  it("no longer pushes the model to fabricate measurable impact", () => {
    expect(CV_SYSTEM_PROMPT).not.toContain("impact mesurable");
  });

  it("ties languages to the profile instead of letting the model guess a level", () => {
    expect(CV_SYSTEM_PROMPT).toContain("profileSections.languages");
    expect(CV_SYSTEM_PROMPT).toContain("N'invente jamais un niveau CECRL");
  });

  it("never lets a spontaneous letter mention an offer (US-120)", () => {
    expect(CV_SYSTEM_PROMPT).toContain("CANDIDATURE SPONTANÉE");
    expect(LETTER_SYSTEM_PROMPT).toContain(
      "n'évoque jamais une annonce, une offre ou un poste publié",
    );
    expect(LETTER_SYSTEM_PROMPT).toContain("Candidature spontanée — <métier>");
  });

  it("treats the offer's missing skills as pointers, never as experience (US-127)", () => {
    expect(CV_SYSTEM_PROMPT).toContain("PISTES À VALORISER");
    expect(CV_SYSTEM_PROMPT).toContain(
      "pistes à valoriser si le candidat les possède, jamais des faits ni une expérience à inventer",
    );
    expect(CV_SYSTEM_PROMPT).toContain(
      "Si aucun élément du PROFIL CANDIDAT ne l'étaye, ignore-la entièrement",
    );
    expect(LETTER_SYSTEM_PROMPT).toContain(
      "ne prête jamais au candidat une expérience qu'il n'a pas écrite",
    );
  });

  it("forces a single output language", () => {
    expect(CV_SYSTEM_PROMPT).toContain("entièrement dans la langue");
    expect(LETTER_SYSTEM_PROMPT).toContain("entièrement dans la langue");
  });
});

describe("translation prompts", () => {
  it("require a full, faithful translation keeping the JSON structure", () => {
    for (const prompt of [
      CV_TRANSLATION_SYSTEM_PROMPT,
      LETTER_TRANSLATION_SYSTEM_PROMPT,
    ]) {
      expect(prompt).toContain("INTÉGRALEMENT");
      expect(prompt).toContain("même structure JSON");
      expect(prompt).toContain("Ne traduis pas");
    }
  });
});

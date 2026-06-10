import { describe, expect, it } from "vitest";
import { CV_SYSTEM_PROMPT } from "./cv-generation.prompts";

describe("CV generation prompt", () => {
  it("defines the structured skills contract", () => {
    expect(CV_SYSTEM_PROMPT).toContain("entre 3 et 5 catégories");
    expect(CV_SYSTEM_PROMPT).toContain("1 à 3 mots");
    expect(CV_SYSTEM_PROMPT).toContain("Maximum 6 items par catégorie");
    expect(CV_SYSTEM_PROMPT).toContain("une seule catégorie");
    expect(CV_SYSTEM_PROMPT).toContain('champ "label"');
    expect(CV_SYSTEM_PROMPT).toContain('champ "category"');
    expect(CV_SYSTEM_PROMPT).toContain("N'invente rien");
  });
});

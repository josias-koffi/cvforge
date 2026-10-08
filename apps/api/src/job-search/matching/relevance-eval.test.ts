import { describe, expect, it } from "vitest";
import { predictRelevance, type EvalExport, type EvalPersona } from "./relevance-eval";

const DEVOPS: EvalPersona = {
  experienceLevel: "confirme",
  headline: "Ingénieur DevOps",
  id: "devops",
  romeCodes: ["M1810"],
  skills: ["Kubernetes", "Terraform", "CI/CD"],
  targetRoles: ["Ingénieur DevOps"],
};

const DATA: EvalExport = {
  genericCodes: [],
  metierCompetences: [],
  offers: [
    {
      contractType: "cdi",
      description: "Plateforme Kubernetes, infrastructure Terraform, pipelines CI/CD.",
      id: "devops-offer",
      romeCode: "M1810",
      romeCompetences: null,
      title: "Ingénieur DevOps (H/F)",
    },
    {
      contractType: "cdi",
      description: "Suivi des chantiers de gros œuvre, métrés et planning.",
      id: "btp-offer",
      romeCode: "F1202",
      romeCompetences: null,
      title: "Technicien BTP (H/F)",
    },
  ],
};

describe("predictRelevance", () => {
  it("judges each pair on the trade alone", () => {
    const predictions = predictRelevance(DATA, [DEVOPS], [
      { id: "devops:devops-offer", offerId: "devops-offer", personaId: "devops" },
      { id: "devops:btp-offer", offerId: "btp-offer", personaId: "devops" },
    ]);

    expect(predictions.map(({ id, relevant }) => ({ id, relevant }))).toEqual([
      { id: "devops:devops-offer", relevant: true },
      { id: "devops:btp-offer", relevant: false },
    ]);
  });

  it("skips a pair whose offer or persona is missing from the export", () => {
    expect(
      predictRelevance(DATA, [DEVOPS], [{ id: "x", offerId: "gone", personaId: "devops" }]),
    ).toEqual([]);
  });
});

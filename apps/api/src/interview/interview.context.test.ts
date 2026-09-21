import { describe, expect, it } from "vitest";
import type { StoredApplication } from "../applications/applications.types";
import {
  buildContextSnapshot,
  clip,
  describeContext,
  describeExperiences,
} from "./interview.context";

function makeApplication(
  overrides: Partial<StoredApplication> = {},
): StoredApplication {
  return {
    extracted: {
      companyName: "Acme",
      requirements: ["TypeScript", "Postgres"],
      responsibilities: ["Tenir la roadmap"],
      summary: "Poste produit",
      title: "Product Engineer",
    },
    rawOfferText: "Nous cherchons un ingenieur produit passionne.",
    ...overrides,
  } as unknown as StoredApplication;
}

describe("clip", () => {
  it("leaves a short string alone", () => {
    expect(clip("court", 20)).toBe("court");
  });

  it("cuts on a word boundary rather than mid-term", () => {
    // "TypeScript Kubernete…" would read as a different skill to the model.
    expect(clip("TypeScript Kubernetes Postgres", 20)).toBe("TypeScript…");
  });

  it("falls back to a hard cut when one word fills the budget", () => {
    expect(clip("Kubernetesaaaaaaaaaaaaaaaa", 10)).toBe("Kubernetes…");
  });

  it("trims before measuring", () => {
    expect(clip("   bonjour   ", 20)).toBe("bonjour");
  });
});

describe("describeExperiences", () => {
  it("keeps only the three most recent, one line each", () => {
    const experiences = Array.from({ length: 5 }, (_, index) => ({
      achievements: [],
      company: `Societe ${index}`,
      description: "",
      endDate: "2024",
      position: "Dev",
      startDate: "2022",
    }));

    const described = describeExperiences(experiences);

    expect(described).toHaveLength(3);
    expect(described[0]).toEqual({
      company: "Societe 0",
      period: "2022 – 2024",
      role: "Dev",
    });
  });

  it("carries no name, phone or address", () => {
    // Vision §10.6: the interviewer needs the roles, not the identity.
    const described = describeExperiences([
      { company: "Acme", endDate: "2024", position: "Dev", startDate: "2022" },
    ]);

    expect(Object.keys(described[0]!)).toEqual(["company", "period", "role"]);
  });

  it("copes with a job that has no dates", () => {
    expect(
      describeExperiences([{ company: "Acme", position: "Dev" }])[0]?.period,
    ).toBe("");
  });
});

describe("buildContextSnapshot", () => {
  it("is null without an application: free practice stays generic", () => {
    expect(buildContextSnapshot(null)).toBeNull();
  });

  it("carries the offer, the company and the candidate", () => {
    const snapshot = buildContextSnapshot(
      makeApplication({
        cvContent: {
          candidate: { title: "Ingenieur produit" },
          experiences: [
            { company: "Acme", endDate: "2024", position: "Dev", startDate: "2022" },
          ],
          skills: { hard: ["TypeScript"], soft: [] },
        },
      } as unknown as Partial<StoredApplication>),
    );

    expect(snapshot).toMatchObject({
      candidateHeadline: "Ingenieur produit",
      candidateSkills: ["TypeScript"],
      companyName: "Acme",
      offerTitle: "Product Engineer",
      requirements: ["TypeScript", "Postgres"],
    });
  });

  it("survives a half-extracted offer instead of failing the interview", () => {
    // This feeds a prompt, not a calculation: missing fields make the
    // interview vaguer, they must not stop it opening.
    const snapshot = buildContextSnapshot({} as StoredApplication);

    expect(snapshot).toMatchObject({
      candidateSkills: [],
      companyName: null,
      offerTitle: null,
      requirements: [],
    });
  });

  it("budgets the offer excerpt: it is paid for on every turn", () => {
    const snapshot = buildContextSnapshot(
      makeApplication({ rawOfferText: "mot ".repeat(1000) }),
    );

    expect(snapshot!.offerExcerpt!.length).toBeLessThanOrEqual(901);
  });

  it("caps the requirements rather than sending the whole list", () => {
    const snapshot = buildContextSnapshot(
      makeApplication({
        extracted: {
          companyName: "Acme",
          requirements: Array.from({ length: 30 }, (_, i) => `skill-${i}`),
          responsibilities: [],
          summary: "",
          title: "Dev",
        },
      } as unknown as Partial<StoredApplication>),
    );

    expect(snapshot!.requirements).toHaveLength(8);
  });

  it("passes the cached company context straight through", () => {
    const company = {
      culture: "Remote-first",
      salaryEstimate: "55-65k",
      sector: "SaaS RH",
      size: "50-200",
      values: ["Transparence"],
    };

    expect(buildContextSnapshot(makeApplication({ companyContext: company }))!.company).toEqual(
      company,
    );
  });
});

describe("describeContext", () => {
  it("says so plainly when there is no offer", () => {
    expect(describeContext(null, "fr")).toContain("Aucune offre");
    expect(describeContext(null, "en")).toContain("No linked application");
  });

  it("names the role and the company, which is the whole point", () => {
    const prose = describeContext(
      buildContextSnapshot(makeApplication()),
      "fr",
    );

    expect(prose).toContain("Product Engineer");
    expect(prose).toContain("Acme");
    expect(prose).toContain("TypeScript");
  });

  it("omits a line rather than printing an empty one", () => {
    const prose = describeContext(
      buildContextSnapshot({} as StoredApplication),
      "fr",
    );

    expect(prose).not.toContain("Intitule du poste");
    expect(prose).not.toContain("null");
  });

  it("includes the company culture once it has been derived", () => {
    const prose = describeContext(
      buildContextSnapshot(
        makeApplication({
          companyContext: {
            culture: "Remote-first, revues de code systematiques",
            salaryEstimate: null,
            sector: "SaaS RH",
            size: null,
            values: ["Transparence", "Autonomie"],
          },
        }),
      ),
      "fr",
    );

    expect(prose).toContain("Remote-first");
    expect(prose).toContain("Transparence, Autonomie");
    // Nothing was derived for these two, so they do not take up the budget.
    expect(prose).not.toContain("Taille:");
  });

  it("writes in the interview's language", () => {
    const snapshot = buildContextSnapshot(makeApplication());

    expect(describeContext(snapshot, "en")).toContain("Offer title:");
    expect(describeContext(snapshot, "fr")).toContain("Intitule du poste:");
  });
});

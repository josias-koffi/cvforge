import type { PromptSafeProfile } from "@cvforge/types";
import { describe, expect, it } from "vitest";
import {
  MAX_RAW_OFFER_CHARS,
  buildGroundedUserMessage,
  offerContextOf,
  type OfferContext,
} from "./cv-generation.payload";
import type { StoredApplication } from "../applications/applications.types";

function makeProfile(
  preferences?: PromptSafeProfile["preferences"],
): PromptSafeProfile {
  return {
    headline: "Développeur back-end",
    identity: { candidateToken: "[CANDIDATE]", city: "Nantes", firstName: "Camille" },
    ...(preferences ? { preferences } : {}),
    profileSections: {
      certifications: [],
      education: [],
      experiences: [],
      interests: "",
      languages: [],
      personalProjects: [],
      softSkills: [],
      summary: "",
      technicalSkills: ["PHP"],
    },
  };
}

const OFFER: OfferContext = {
  companyName: "CloudScale",
  language: "fr",
  rawOfferText: "x".repeat(5000),
  requirements: ["Kubernetes"],
  responsibilities: [],
  summary: "Ingénieur plateforme",
  title: "Ingénieur Plateforme Senior",
};

describe("pointers to bring forward (US-127)", () => {
  it("fences them between the offer and the profile, as pointers, not facts", () => {
    const message = buildGroundedUserMessage(makeProfile(), {
      ...OFFER,
      skillsToHighlight: ["Kubernetes", "Tests unitaires"],
    });
    const block = message.indexOf("=== PISTES À VALORISER");

    expect(block).toBeGreaterThan(message.indexOf("=== FIN TEXTE BRUT"));
    expect(block).toBeLessThan(message.indexOf("=== PROFIL CANDIDAT"));
    expect(message).toContain("SI ET SEULEMENT SI LE PROFIL LES ÉTAYE");
    expect(message).toContain("Ce ne sont PAS des faits concernant le candidat");
    expect(message).toContain('["Kubernetes","Tests unitaires"]');
    // Not repeated inside the offer's own JSON.
    expect(message).not.toContain('"skillsToHighlight"');
  });

  it("adds no block when the offer lacked nothing", () => {
    expect(
      buildGroundedUserMessage(makeProfile(), { ...OFFER, skillsToHighlight: [] }),
    ).not.toContain("PISTES À VALORISER");
    expect(buildGroundedUserMessage(makeProfile(), OFFER)).not.toContain(
      "PISTES À VALORISER",
    );
  });

  it("reads them from the application, empty for an older one", () => {
    const application = {
      extracted: {
        companyName: "CloudScale",
        language: "fr",
        requirements: [],
        responsibilities: [],
        summary: null,
        title: "Ingénieur",
      },
      rawOfferText: "Texte",
    } as unknown as StoredApplication;

    expect(offerContextOf(application).skillsToHighlight).toEqual([]);
    expect(
      offerContextOf({ ...application, skillsToHighlight: ["Kubernetes"] })
        .skillsToHighlight,
    ).toEqual(["Kubernetes"]);
  });
});

describe("buildGroundedUserMessage", () => {
  it("fences the offer off from the profile and puts the profile last", () => {
    const message = buildGroundedUserMessage(makeProfile(), OFFER);

    expect(message).toContain("=== OFFRE D'EMPLOI");
    expect(message).toContain("=== PROFIL CANDIDAT");
    expect(message.indexOf("=== OFFRE D'EMPLOI")).toBeLessThan(
      message.indexOf("=== PROFIL CANDIDAT"),
    );
  });

  it("truncates the raw offer, the main contamination vector", () => {
    const message = buildGroundedUserMessage(makeProfile(), OFFER);

    expect(message).toContain("x".repeat(MAX_RAW_OFFER_CHARS));
    expect(message).not.toContain("x".repeat(MAX_RAW_OFFER_CHARS + 1));
  });

  it("lists what the model is allowed to draw from", () => {
    const message = buildGroundedUserMessage(makeProfile(), OFFER);

    expect(message).toContain("INVENTAIRE AUTORISÉ");
    expect(message).toContain("allowedSkills");
  });

  it("keeps the candidate's search out of the CV prompt", () => {
    const preferences = {
      availabilityDate: "2026-11-02",
      availabilityMode: "date" as const,
      contractTypes: "CDI",
    };

    const message = buildGroundedUserMessage(makeProfile(preferences), OFFER);

    // A CV is not the place to announce a notice period.
    expect(message).not.toContain("RECHERCHE DU CANDIDAT");
    expect(message).not.toContain("2026-11-02");
  });

  it("hands the search to the letter prompt when asked", () => {
    const message = buildGroundedUserMessage(
      makeProfile({
        availabilityDate: "2026-11-02",
        availabilityMode: "date",
        contractTypes: "CDI",
      }),
      OFFER,
      { includePreferences: true },
    );

    expect(message).toContain("RECHERCHE DU CANDIDAT");
    expect(message).toContain("2026-11-02");
    expect(message).toContain("CDI");
  });

  it("prefers the structured search over the legacy free-text contracts", () => {
    const message = buildGroundedUserMessage(
      makeProfile({
        availabilityDate: "",
        availabilityMode: "immediate",
        contractTypes: "CDI",
      }),
      OFFER,
      {
        contractSearch: "Stage ou alternance (rythme 3j/2j)",
        includePreferences: true,
      },
    );

    expect(message).toContain("Stage ou alternance (rythme 3j/2j)");
    expect(message).not.toContain("\"contratsRecherches\":\"CDI\"");
  });

  it("keeps the legacy free-text contracts while a profile has no search project", () => {
    const message = buildGroundedUserMessage(
      makeProfile({
        availabilityDate: "",
        availabilityMode: "immediate",
        contractTypes: "CDI",
      }),
      OFFER,
      { contractSearch: "", includePreferences: true },
    );

    expect(message).toContain("CDI");
  });

  it("spells out an immediate availability rather than sending a code", () => {
    const message = buildGroundedUserMessage(
      makeProfile({
        availabilityDate: "",
        availabilityMode: "immediate",
        contractTypes: "",
      }),
      OFFER,
      { includePreferences: true },
    );

    expect(message).toContain("immédiate");
  });

  it("omits the block entirely when the candidate stated nothing", () => {
    const message = buildGroundedUserMessage(
      makeProfile({
        availabilityDate: "",
        availabilityMode: "",
        contractTypes: "",
      }),
      OFFER,
      { includePreferences: true },
    );

    // An empty availability must not read as "available immediately".
    expect(message).not.toContain("RECHERCHE DU CANDIDAT");
  });

  it("carries the user's refinement in its own block", () => {
    const message = buildGroundedUserMessage(makeProfile(), OFFER, {
      refinement: "Insister sur la pédagogie",
    });

    expect(message).toContain("=== DEMANDE DE L'UTILISATEUR ===");
    expect(message).toContain("Insister sur la pédagogie");
  });
});

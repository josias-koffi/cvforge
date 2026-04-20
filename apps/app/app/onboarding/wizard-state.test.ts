import { describe, expect, it, vi } from "vitest";
import { createEmptyDraft } from "./draft";
import {
  formatSavedAt,
  getProgressPercent,
  isPersonalStepComplete,
  onboardingSteps,
  updateDraftMeta,
} from "./wizard-state";

describe("onboarding wizard state", () => {
  it("defines the five onboarding steps from the vision", () => {
    expect(onboardingSteps).toHaveLength(5);
    expect(onboardingSteps[0]?.title).toContain("Informations personnelles");
    expect(onboardingSteps[4]?.title).toContain("Recapitulatif");
  });

  it("formats saved timestamps consistently", () => {
    expect(formatSavedAt(null)).toBe("Aucun brouillon local pour le moment.");
    expect(formatSavedAt("bad-date")).toBe("Brouillon local enregistre.");
    expect(formatSavedAt("2026-04-20T08:00:00.000Z")).toContain(
      "Brouillon repris et enregistre le",
    );
  });

  it("checks completion of the required personal fields", () => {
    const incompleteDraft = createEmptyDraft("user@example.com");
    const completeDraft = {
      ...incompleteDraft,
      personal: {
        city: "Paris",
        firstName: "Jane",
        lastName: "Doe",
        phone: "0601020304",
        professionalEmail: "user@example.com",
      },
    };

    expect(isPersonalStepComplete(incompleteDraft)).toBe(false);
    expect(isPersonalStepComplete(completeDraft)).toBe(true);
  });

  it("updates the wizard metadata and progress", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T08:30:00.000Z"));

    const updatedDraft = updateDraftMeta(
      createEmptyDraft("user@example.com"),
      3,
    );

    expect(updatedDraft.meta.currentStep).toBe(3);
    expect(updatedDraft.meta.lastSavedAt).toBe("2026-04-20T08:30:00.000Z");
    expect(getProgressPercent(3)).toBe(80);

    vi.useRealTimers();
  });
});

import { describe, expect, it } from "vitest";
import {
  ONBOARDING_DRAFT_STORAGE_KEY,
  createEmptyDraft,
  loadDraftFromStorage,
  saveDraftToStorage,
} from "./draft";

describe("onboarding draft helpers", () => {
  it("creates an empty draft prefilled with the authenticated email", () => {
    const draft = createEmptyDraft("user@example.com");

    expect(draft.personal.professionalEmail).toBe("user@example.com");
    expect(draft.meta.currentStep).toBe(0);
    expect(draft.importCv.fileName).toBe("");
  });

  it("loads a sanitized draft from storage", () => {
    const storage = {
      getItem: (key: string) =>
        key === ONBOARDING_DRAFT_STORAGE_KEY
          ? JSON.stringify({
              meta: {
                currentStep: 3,
                lastSavedAt: "2026-04-20T10:00:00.000Z",
              },
              personal: {
                city: "Paris",
                firstName: "Jane",
                lastName: "Doe",
                phone: "0600000000",
                professionalEmail: "",
              },
            })
          : null,
    };

    const draft = loadDraftFromStorage("persisted@example.com", storage);

    expect(draft.meta.currentStep).toBe(3);
    expect(draft.personal.firstName).toBe("Jane");
    expect(draft.personal.professionalEmail).toBe("persisted@example.com");
  });

  it("falls back to an empty draft when storage contains invalid JSON", () => {
    const storage = {
      getItem: () => "not-json",
    };

    const draft = loadDraftFromStorage("fallback@example.com", storage);

    expect(draft.personal.professionalEmail).toBe("fallback@example.com");
    expect(draft.meta.lastSavedAt).toBeNull();
  });

  it("persists the serialized draft when storage is available", () => {
    let writtenKey = "";
    let writtenValue = "";
    const storage = {
      setItem: (key: string, value: string) => {
        writtenKey = key;
        writtenValue = value;
      },
    };

    saveDraftToStorage(createEmptyDraft("writer@example.com"), storage);

    expect(writtenKey).toBe(ONBOARDING_DRAFT_STORAGE_KEY);
    expect(writtenValue).toContain("writer@example.com");
  });
});

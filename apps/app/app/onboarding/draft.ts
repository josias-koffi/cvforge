import {
  normalizeEmail,
  normalizeFutureDateInput,
  normalizeLongText,
  normalizePastDateInput,
  normalizePhone,
  normalizeShortText,
  normalizeUrlField,
} from "../input-guards";

export const ONBOARDING_DRAFT_STORAGE_KEY = "cvforge-onboarding-draft";

export type OnboardingDraft = {
  personal: {
    firstName: string;
    lastName: string;
    city: string;
    phone: string;
    professionalEmail: string;
  };
  links: {
    linkedIn: string;
    github: string;
    portfolio: string;
    other: string;
  };
  additional: {
    birthDate: string;
    nationality: string;
    hasDrivingLicense: boolean;
    languages: string;
    educationLevel: string;
    targetSectors: string;
    contractTypes: string;
    availabilityMode: "immediate" | "date" | "";
    availabilityDate: string;
    salaryRange: string;
  };
  importCv: {
    fileName: string;
    notes: string;
    skipped: boolean;
  };
  meta: {
    currentStep: number;
    lastSavedAt: string | null;
  };
};

export function createEmptyDraft(sessionEmail: string): OnboardingDraft {
  return {
    additional: {
      availabilityDate: "",
      availabilityMode: "",
      birthDate: "",
      contractTypes: "",
      educationLevel: "",
      hasDrivingLicense: false,
      languages: "",
      nationality: "",
      salaryRange: "",
      targetSectors: "",
    },
    importCv: {
      fileName: "",
      notes: "",
      skipped: false,
    },
    links: {
      github: "",
      linkedIn: "",
      other: "",
      portfolio: "",
    },
    meta: {
      currentStep: 0,
      lastSavedAt: null,
    },
    personal: {
      city: "",
      firstName: "",
      lastName: "",
      phone: "",
      professionalEmail: sessionEmail,
    },
  };
}

function asBoolean(value: unknown) {
  return value === true;
}

function asStep(value: unknown) {
  return typeof value === "number" && value >= 0 && value <= 4 ? value : 0;
}

export function sanitizeDraft(
  value: unknown,
  sessionEmail: string,
): OnboardingDraft {
  const fallback = createEmptyDraft(sessionEmail);

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<OnboardingDraft>;

  return {
    additional: {
      availabilityDate:
        candidate.additional?.availabilityMode === "date"
          ? normalizeFutureDateInput(candidate.additional?.availabilityDate)
          : "",
      availabilityMode:
        candidate.additional?.availabilityMode === "immediate" ||
        candidate.additional?.availabilityMode === "date"
          ? candidate.additional.availabilityMode
          : "",
      birthDate: normalizePastDateInput(candidate.additional?.birthDate),
      contractTypes: normalizeLongText(candidate.additional?.contractTypes, 300),
      educationLevel: normalizeShortText(candidate.additional?.educationLevel, 120),
      hasDrivingLicense: asBoolean(candidate.additional?.hasDrivingLicense),
      languages: normalizeLongText(candidate.additional?.languages, 300),
      nationality: normalizeShortText(candidate.additional?.nationality, 80),
      salaryRange: normalizeShortText(candidate.additional?.salaryRange, 80),
      targetSectors: normalizeLongText(candidate.additional?.targetSectors, 300),
    },
    importCv: {
      fileName: normalizeShortText(candidate.importCv?.fileName, 160),
      notes: normalizeLongText(candidate.importCv?.notes),
      skipped: asBoolean(candidate.importCv?.skipped),
    },
    links: {
      github: normalizeUrlField(candidate.links?.github),
      linkedIn: normalizeUrlField(candidate.links?.linkedIn),
      other: normalizeUrlField(candidate.links?.other),
      portfolio: normalizeUrlField(candidate.links?.portfolio),
    },
    meta: {
      currentStep: asStep(candidate.meta?.currentStep),
      lastSavedAt:
        candidate.meta?.lastSavedAt && typeof candidate.meta.lastSavedAt === "string"
          ? candidate.meta.lastSavedAt
          : null,
    },
    personal: {
      city: normalizeShortText(candidate.personal?.city, 120),
      firstName: normalizeShortText(candidate.personal?.firstName, 80),
      lastName: normalizeShortText(candidate.personal?.lastName, 80),
      phone: normalizePhone(candidate.personal?.phone),
      professionalEmail:
        normalizeEmail(candidate.personal?.professionalEmail, sessionEmail) || sessionEmail,
    },
  };
}

export function loadDraftFromStorage(
  sessionEmail: string,
  storage: Pick<Storage, "getItem"> | undefined,
): OnboardingDraft {
  if (!storage) {
    return createEmptyDraft(sessionEmail);
  }

  const raw = storage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);

  if (!raw) {
    return createEmptyDraft(sessionEmail);
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeDraft(parsed, sessionEmail);
  } catch {
    return createEmptyDraft(sessionEmail);
  }
}

export function saveDraftToStorage(
  draft: OnboardingDraft,
  storage: Pick<Storage, "setItem"> | undefined,
) {
  if (!storage) {
    return;
  }

  storage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

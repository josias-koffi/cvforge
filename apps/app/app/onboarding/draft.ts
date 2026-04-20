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

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
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
      availabilityDate: asString(candidate.additional?.availabilityDate),
      availabilityMode:
        candidate.additional?.availabilityMode === "immediate" ||
        candidate.additional?.availabilityMode === "date"
          ? candidate.additional.availabilityMode
          : "",
      birthDate: asString(candidate.additional?.birthDate),
      contractTypes: asString(candidate.additional?.contractTypes),
      educationLevel: asString(candidate.additional?.educationLevel),
      hasDrivingLicense: asBoolean(candidate.additional?.hasDrivingLicense),
      languages: asString(candidate.additional?.languages),
      nationality: asString(candidate.additional?.nationality),
      salaryRange: asString(candidate.additional?.salaryRange),
      targetSectors: asString(candidate.additional?.targetSectors),
    },
    importCv: {
      fileName: asString(candidate.importCv?.fileName),
      notes: asString(candidate.importCv?.notes),
      skipped: asBoolean(candidate.importCv?.skipped),
    },
    links: {
      github: asString(candidate.links?.github),
      linkedIn: asString(candidate.links?.linkedIn),
      other: asString(candidate.links?.other),
      portfolio: asString(candidate.links?.portfolio),
    },
    meta: {
      currentStep: asStep(candidate.meta?.currentStep),
      lastSavedAt:
        candidate.meta?.lastSavedAt && typeof candidate.meta.lastSavedAt === "string"
          ? candidate.meta.lastSavedAt
          : null,
    },
    personal: {
      city: asString(candidate.personal?.city),
      firstName: asString(candidate.personal?.firstName),
      lastName: asString(candidate.personal?.lastName),
      phone: asString(candidate.personal?.phone),
      professionalEmail:
        asString(candidate.personal?.professionalEmail) || sessionEmail,
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

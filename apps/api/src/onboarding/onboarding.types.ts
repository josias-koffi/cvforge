export const ONBOARDING_STORE = Symbol("ONBOARDING_STORE");

/** Both dates of an account; an unknown account reads as both null. */
export type StoredOnboarding = {
  completedAt: Date | null;
  gettingStartedDismissedAt: Date | null;
};

export type OnboardingStore = {
  read: (email: string) => Promise<StoredOnboarding>;
  /** Sets the date only if it is still null: the first instant is kept. */
  markCompleted: (email: string, at: Date) => Promise<void>;
  /** Same rule as `markCompleted`, for the dashboard checklist. */
  markGettingStartedDismissed: (email: string, at: Date) => Promise<void>;
};

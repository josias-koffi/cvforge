/**
 * Where an account stands with the guided first-login onboarding (US-149).
 * Dates are ISO strings; null means "not yet".
 */
export type OnboardingStatus = {
  completedAt: string | null;
  gettingStartedDismissedAt: string | null;
};

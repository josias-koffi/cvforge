import type { OnboardingStatus } from "@cvforge/types";
import type { OnboardingStore, StoredOnboarding } from "./onboarding.types";

/**
 * The guided first-login onboarding (US-149): whether an account finished it,
 * and whether it hid the dashboard checklist that follows it.
 */
export class OnboardingService {
  constructor(
    private readonly store: OnboardingStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async status(email: string): Promise<OnboardingStatus> {
    return toStatus(await this.store.read(email));
  }

  async complete(email: string): Promise<OnboardingStatus> {
    await this.store.markCompleted(email, this.now());
    return this.status(email);
  }

  async dismissGettingStarted(email: string): Promise<OnboardingStatus> {
    await this.store.markGettingStartedDismissed(email, this.now());
    return this.status(email);
  }
}

function toStatus(stored: StoredOnboarding): OnboardingStatus {
  return {
    completedAt: stored.completedAt?.toISOString() ?? null,
    gettingStartedDismissedAt:
      stored.gettingStartedDismissedAt?.toISOString() ?? null,
  };
}

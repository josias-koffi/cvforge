import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../database/database.types";
import { authAccounts } from "../database/schema";
import type { OnboardingStore, StoredOnboarding } from "./onboarding.types";

export class PgOnboardingStore implements OnboardingStore {
  constructor(private readonly db: Database) {}

  async read(email: string): Promise<StoredOnboarding> {
    const [row] = await this.db
      .select({
        completedAt: authAccounts.onboardingCompletedAt,
        gettingStartedDismissedAt: authAccounts.gettingStartedDismissedAt,
      })
      .from(authAccounts)
      .where(eq(authAccounts.email, email));

    return row ?? { completedAt: null, gettingStartedDismissedAt: null };
  }

  async markCompleted(email: string, at: Date) {
    await this.db
      .update(authAccounts)
      .set({ onboardingCompletedAt: at })
      .where(
        and(
          eq(authAccounts.email, email),
          isNull(authAccounts.onboardingCompletedAt),
        ),
      );
  }

  async markGettingStartedDismissed(email: string, at: Date) {
    await this.db
      .update(authAccounts)
      .set({ gettingStartedDismissedAt: at })
      .where(
        and(
          eq(authAccounts.email, email),
          isNull(authAccounts.gettingStartedDismissedAt),
        ),
      );
  }
}

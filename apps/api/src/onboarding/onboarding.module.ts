import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { OnboardingController } from "./onboarding.controller";
import { PgOnboardingStore } from "./onboarding.pg-store";
import { OnboardingService } from "./onboarding.service";
import { ONBOARDING_STORE, type OnboardingStore } from "./onboarding.types";

@Module({
  imports: [AuthModule],
  controllers: [OnboardingController],
  providers: [
    {
      provide: ONBOARDING_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgOnboardingStore(db),
    },
    {
      provide: OnboardingService,
      inject: [ONBOARDING_STORE],
      useFactory: (store: OnboardingStore) => new OnboardingService(store),
    },
  ],
})
export class OnboardingModule {}

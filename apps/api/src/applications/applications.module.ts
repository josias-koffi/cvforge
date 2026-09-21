import { Module } from "@nestjs/common";
import { OpenRouterModule, OPENROUTER_SERVICE } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { CreditsModule } from "../credits/credits.module";
import { CreditsService } from "../credits/credits.service";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";
import { CompanyContextService } from "./company-context.service";
import { PgApplicationsStore } from "./applications.pg-store";
import { APPLICATIONS_STORE, type ApplicationsStore } from "./applications.types";
import { ProfilesModule } from "../profiles/profiles.module";
import { PROFILES_STORE, type ProfilesStore } from "../profiles/profiles.types";

@Module({
  imports: [AuthModule, CreditsModule, OpenRouterModule, ProfilesModule],
  controllers: [ApplicationsController],
  providers: [
    {
      provide: APPLICATIONS_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgApplicationsStore(db),
    },
    {
      provide: ApplicationsService,
      inject: [
        APPLICATIONS_STORE,
        OPENROUTER_SERVICE,
        CreditsService,
        PROFILES_STORE,
      ],
      useFactory: (
        store: ApplicationsStore,
        openRouterService: ConstructorParameters<typeof ApplicationsService>[1],
        creditsService: ConstructorParameters<typeof ApplicationsService>[2],
        profilesStore: ProfilesStore,
      ) =>
        new ApplicationsService(
          store,
          openRouterService,
          creditsService,
          async (userEmail) =>
            (await profilesStore.findByUserEmail(userEmail))?.profiles.map(
              ({ id }) => id,
            ) ?? [],
        ),
    },
    {
      provide: CompanyContextService,
      inject: [OPENROUTER_SERVICE, APPLICATIONS_STORE],
      useFactory: (
        openRouterService: ConstructorParameters<typeof CompanyContextService>[0],
        store: ApplicationsStore,
      ) => new CompanyContextService(openRouterService, store),
    },
  ],
  exports: [APPLICATIONS_STORE, ApplicationsService, CompanyContextService],
})
export class ApplicationsModule {}

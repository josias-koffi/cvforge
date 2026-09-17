import { Module } from "@nestjs/common";
import { OpenRouterModule, OPENROUTER_SERVICE } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { CreditsService } from "../credits/credits.service";
import { resolveApplicationsConfig } from "./applications.config";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";
import { FileApplicationsStore } from "./applications.store";
import { APPLICATIONS_STORE, type ApplicationsStore } from "./applications.types";
import { ProfilesModule } from "../profiles/profiles.module";
import { PROFILES_STORE, type ProfilesStore } from "../profiles/profiles.types";

@Module({
  imports: [AuthModule, CreditsModule, OpenRouterModule, ProfilesModule],
  controllers: [ApplicationsController],
  providers: [
    {
      provide: APPLICATIONS_STORE,
      useFactory: () =>
        new FileApplicationsStore(
          resolveApplicationsConfig(process.env).stateFilePath,
        ),
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
  ],
  exports: [APPLICATIONS_STORE, ApplicationsService],
})
export class ApplicationsModule {}

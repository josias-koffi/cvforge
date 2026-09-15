import { Module } from "@nestjs/common";
import { OpenRouterModule, OPENROUTER_SERVICE } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { CreditsService } from "../credits/credits.service";
import { resolveApplicationsConfig } from "./applications.config";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";
import { FileApplicationsStore } from "./applications.store";
import { PROFILES_STORE, ProfilesModule } from "../profiles/profiles.module";
import type { FileProfilesStore } from "../profiles/profiles.store";

@Module({
  imports: [AuthModule, CreditsModule, OpenRouterModule, ProfilesModule],
  controllers: [ApplicationsController],
  providers: [
    {
      provide: ApplicationsService,
      inject: [OPENROUTER_SERVICE, CreditsService, PROFILES_STORE],
      useFactory: (
        openRouterService: ConstructorParameters<typeof ApplicationsService>[1],
        creditsService: ConstructorParameters<typeof ApplicationsService>[2],
        profilesStore: FileProfilesStore,
      ) =>
        new ApplicationsService(
          new FileApplicationsStore(
            resolveApplicationsConfig(process.env).stateFilePath,
          ),
          openRouterService,
          creditsService,
          (userEmail) =>
            profilesStore.findByUserEmail(userEmail)?.profiles.map(({ id }) => id) ?? [],
        ),
    },
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

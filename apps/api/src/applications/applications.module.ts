import { Module } from "@nestjs/common";
import { OpenRouterModule, OPENROUTER_SERVICE } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { CreditsService } from "../credits/credits.service";
import { resolveApplicationsConfig } from "./applications.config";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";
import { FileApplicationsStore } from "./applications.store";

@Module({
  imports: [AuthModule, CreditsModule, OpenRouterModule],
  controllers: [ApplicationsController],
  providers: [
    {
      provide: ApplicationsService,
      inject: [OPENROUTER_SERVICE, CreditsService],
      useFactory: (openRouterService: ConstructorParameters<
        typeof ApplicationsService
      >[1], creditsService: ConstructorParameters<typeof ApplicationsService>[2]) =>
        new ApplicationsService(
          new FileApplicationsStore(
            resolveApplicationsConfig(process.env).stateFilePath,
          ),
          openRouterService,
          creditsService,
        ),
    },
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

import { Module } from "@nestjs/common";
import { OpenRouterModule, OPENROUTER_SERVICE } from "../ai/openrouter.module";
import { AuthModule } from "../auth/auth.module";
import { resolveApplicationsConfig } from "./applications.config";
import { ApplicationsController } from "./applications.controller";
import { ApplicationsService } from "./applications.service";
import { FileApplicationsStore } from "./applications.store";

@Module({
  imports: [AuthModule, OpenRouterModule],
  controllers: [ApplicationsController],
  providers: [
    {
      provide: ApplicationsService,
      inject: [OPENROUTER_SERVICE],
      useFactory: (openRouterService: ConstructorParameters<
        typeof ApplicationsService
      >[1]) =>
        new ApplicationsService(
          new FileApplicationsStore(
            resolveApplicationsConfig(process.env).stateFilePath,
          ),
          openRouterService,
        ),
    },
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

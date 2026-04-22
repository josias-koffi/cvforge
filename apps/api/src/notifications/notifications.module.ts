import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { resolveApplicationsConfig } from "../applications/applications.config";
import { FileApplicationsStore } from "../applications/applications.store";
import { resolveNotificationsConfig } from "./notifications.config";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { FileNotificationsStore } from "./notifications.store";

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    {
      provide: NotificationsService,
      useFactory: () => {
        const config = resolveNotificationsConfig(process.env);

        return new NotificationsService(
          new FileNotificationsStore(config.stateFilePath),
          new FileApplicationsStore(
            resolveApplicationsConfig(process.env).stateFilePath,
          ),
          config,
        );
      },
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}

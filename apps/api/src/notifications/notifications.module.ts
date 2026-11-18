import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { ApplicationsModule } from "../applications/applications.module";
import { DATABASE, type Database } from "../database/database.types";
import {
  APPLICATIONS_STORE,
  type ApplicationsStore,
} from "../applications/applications.types";
import { resolveNotificationsConfig } from "./notifications.config";
import { NotificationsController } from "./notifications.controller";
import { NotificationsMailerService } from "./notifications-mailer.service";
import { NotificationsService } from "./notifications.service";
import { PgNotificationsStore } from "./notifications.pg-store";
import { JobAlertInbox } from "./job-alert-inbox";
import { PushNotifier, resolvePushConfig } from "./push-notifier";
import {
  PgPushSubscriptionsStore,
  PUSH_SUBSCRIPTIONS_STORE,
  type PushSubscriptionsStore,
} from "./push-subscriptions.pg-store";
import {
  NOTIFICATIONS_STORE,
  type NotificationsStore,
} from "./notifications.types";

@Module({
  imports: [AuthModule, ApplicationsModule, MailModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsMailerService,
    {
      provide: NOTIFICATIONS_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgNotificationsStore(db),
    },
    {
      provide: JobAlertInbox,
      inject: [NOTIFICATIONS_STORE],
      useFactory: (store: NotificationsStore) => new JobAlertInbox(store),
    },
    {
      provide: PUSH_SUBSCRIPTIONS_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgPushSubscriptionsStore(db),
    },
    {
      provide: PushNotifier,
      inject: [PUSH_SUBSCRIPTIONS_STORE],
      useFactory: (store: PushSubscriptionsStore) =>
        new PushNotifier(store, resolvePushConfig(process.env)),
    },
    {
      provide: NotificationsService,
      inject: [NOTIFICATIONS_STORE, APPLICATIONS_STORE, NotificationsMailerService],
      useFactory: (
        store: NotificationsStore,
        applicationsStore: ApplicationsStore,
        notificationsMailer: NotificationsMailerService,
      ) =>
        new NotificationsService(
          store,
          applicationsStore,
          resolveNotificationsConfig(process.env),
          notificationsMailer,
        ),
    },
  ],
  exports: [
    NOTIFICATIONS_STORE,
    NotificationsService,
    JobAlertInbox,
    PUSH_SUBSCRIPTIONS_STORE,
    PushNotifier,
  ],
})
export class NotificationsModule {}

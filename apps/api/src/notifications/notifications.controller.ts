import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { NotificationsService } from "./notifications.service";
import { PushNotifier } from "./push-notifier";
import {
  PUSH_SUBSCRIPTIONS_STORE,
  type PushSubscriptionsStore,
} from "./push-subscriptions.pg-store";
import { readPushSubscription } from "./push-subscription-input";

type RequestLike = {
  headers: { cookie?: string };
};

@Controller("notifications")
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(PushNotifier) private readonly pushNotifier: PushNotifier,
    @Inject(PUSH_SUBSCRIPTIONS_STORE)
    private readonly pushSubscriptions: PushSubscriptionsStore,
  ) {}

  @Get()
  async listNotifications(@Req() request: RequestLike) {
    const session = this.readSession(request);

    return {
      notifications: await this.notificationsService.listNotifications(
        session.email,
      ),
    };
  }

  @Get("summary")
  async getSummary(@Req() request: RequestLike) {
    const session = this.readSession(request);

    return {
      summary: await this.notificationsService.getSummary(session.email),
    };
  }

  @Get("preferences")
  getPreferences(@Req() request: RequestLike) {
    const session = this.readSession(request);

    return this.notificationsService.getPreferences(session.email);
  }

  @Post("preferences")
  updatePreferences(
    @Body()
    body: {
      email?: {
        applicationFollowUp?: boolean;
        jobDigest?: boolean;
        creditPurchaseConfirmed?: boolean;
      };
      /**
       * Alerts (US-166): `enabled`, `threshold`, `rhythm`; their paid analysis
       * (US-168): `aiAnalysis`, `aiFilter`. Unknown values are ignored.
       */
      jobAlerts?: {
        enabled?: unknown;
        threshold?: unknown;
        rhythm?: unknown;
        aiAnalysis?: unknown;
        aiFilter?: unknown;
      };
    },
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);

    return this.notificationsService.updatePreferences(session.email, {
      email: {
        applicationFollowUp: body.email?.applicationFollowUp,
        creditPurchaseConfirmed: body.email?.creditPurchaseConfirmed,
        jobDigest: body.email?.jobDigest,
      },
      jobAlerts: body.jobAlerts,
    });
  }

  @Post("read-all")
  async markAllAsRead(@Req() request: RequestLike) {
    const session = this.readSession(request);

    return {
      marked: await this.notificationsService.markAllAsRead(session.email),
    };
  }

  /** The VAPID public key the browser subscribes with; null when push is off. */
  @Get("push")
  getPushConfig(@Req() request: RequestLike) {
    this.readSession(request);

    return { publicKey: this.pushNotifier.publicKey };
  }

  @Post("push/subscribe")
  async subscribePush(@Body() body: unknown, @Req() request: RequestLike) {
    const session = this.readSession(request);
    const subscription = readPushSubscription(body);

    if (!subscription || !this.pushNotifier.publicKey) {
      throw new BadRequestException("Abonnement aux notifications invalide.");
    }

    await this.pushSubscriptions.save(session.email, subscription);

    return { subscribed: true };
  }

  @Post("push/unsubscribe")
  async unsubscribePush(
    @Body() body: { endpoint?: unknown },
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);

    if (typeof body.endpoint === "string") {
      await this.pushSubscriptions.remove(session.email, body.endpoint);
    }

    return { subscribed: false };
  }

  @Post(":notificationId/read")
  async markAsRead(
    @Param("notificationId") notificationId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);

    return {
      notification: await this.notificationsService.markAsRead(
        session.email,
        notificationId,
      ),
    };
  }

  private readSession(request: RequestLike) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return session;
  }
}

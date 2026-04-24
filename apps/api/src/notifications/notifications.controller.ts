import {
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

type RequestLike = {
  headers: { cookie?: string };
};

@Controller("notifications")
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
    @Inject(AuthService) private readonly authService: AuthService,
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
        creditPurchaseConfirmed?: boolean;
      };
    },
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);

    return this.notificationsService.updatePreferences(session.email, {
      applicationFollowUp: body.email?.applicationFollowUp,
      creditPurchaseConfirmed: body.email?.creditPurchaseConfirmed,
    });
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

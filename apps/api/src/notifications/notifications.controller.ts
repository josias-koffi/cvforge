import {
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
  listNotifications(@Req() request: RequestLike) {
    const session = this.readSession(request);

    return {
      notifications: this.notificationsService.listNotifications(session.email),
    };
  }

  @Get("summary")
  getSummary(@Req() request: RequestLike) {
    const session = this.readSession(request);

    return {
      summary: this.notificationsService.getSummary(session.email),
    };
  }

  @Post(":notificationId/read")
  markAsRead(
    @Param("notificationId") notificationId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.readSession(request);

    return {
      notification: this.notificationsService.markAsRead(
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

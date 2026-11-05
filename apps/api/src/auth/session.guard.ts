import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service";
import { IS_PUBLIC_ROUTE } from "./public.decorator";

/**
 * Private by default: any route not marked `@Public()` needs a valid session.
 * Handlers still make their own finer checks (admin role, resource owner);
 * this guard only guarantees none can be reached anonymously by omission.
 * `SessionStateMiddleware` has already turned suspended or revoked sessions
 * into a 403 before this runs.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_ROUTE,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: { cookie?: string } }>();

    if (!this.authService.readSessionFromCookieHeader(request.headers.cookie)) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return true;
  }
}

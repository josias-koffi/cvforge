import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { publicError } from "@cvforge/types";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service";
import { IS_PUBLIC_ROUTE } from "./public.decorator";
import {
  RATE_LIMIT_CLOCK,
  RATE_LIMIT_STORE,
  type Clock,
  type RateLimitStore,
} from "../shared/rate-limit/rate-limit.types";
import {
  USER_RATE_LIMIT,
  type UserRateLimit,
} from "../shared/rate-limit/user-rate-limit.decorator";

const USER_RATE_LIMITED_MESSAGE =
  "Trop de demandes en peu de temps. Reessayez dans quelques instants.";

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
    @Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore,
    @Inject(RATE_LIMIT_CLOCK) private readonly now: Clock,
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

    const session = this.authService.readSessionFromCookieHeader(request.headers.cookie);

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    const limit = this.reflector.get<UserRateLimit | undefined>(
      USER_RATE_LIMIT,
      context.getHandler(),
    );

    if (limit) {
      this.meter(limit, session.email, context);
    }

    return true;
  }

  /** Counted per account, and only once every window has room (a refusal costs nothing). */
  private meter(limit: UserRateLimit, email: string, context: ExecutionContext) {
    const now = this.now();
    const key = `user:${limit.name}:${email.toLowerCase()}`;

    for (const rule of limit.rules) {
      if (this.store.count(key, rule.windowMs, now) < rule.limit) continue;

      const oldest = this.store.oldestHit(key, rule.windowMs, now);
      const retryAfter = oldest === null ? Math.ceil(rule.windowMs / 1000) : Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000));

      context.switchToHttp().getResponse<{ setHeader?: (name: string, value: string) => void }>().setHeader?.(
        "Retry-After",
        String(retryAfter),
      );
      throw new HttpException(
        publicError("RATE_LIMITED", USER_RATE_LIMITED_MESSAGE),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.store.record(key, now);
  }
}

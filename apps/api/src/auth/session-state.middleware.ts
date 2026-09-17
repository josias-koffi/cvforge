import {
  ForbiddenException,
  Inject,
  Injectable,
  type NestMiddleware,
} from "@nestjs/common";
import { ACCOUNT_STATUS_SUSPENDED } from "@cvforge/types";
import { AuthService } from "./auth.service";
import {
  REVOKED_SESSION_MESSAGE,
  SUSPENDED_ACCOUNT_MESSAGE,
} from "./session-messages";

type RequestLike = { headers: { cookie?: string } };

/**
 * The one place a session is checked against database state.
 *
 * Session cookies are stateless HMACs, so `requireSession` alone cannot know
 * that an account was suspended or its sessions revoked — it only proves the
 * cookie was signed by us and has not expired. Doing that check in every
 * handler would mean making all ~65 call sites async; doing it here costs one
 * indexed read per authenticated request and leaves them untouched.
 *
 * An absent or unsigned cookie passes through: rejecting it is the handler's
 * job, and answering 403 here would turn every anonymous request to a public
 * route into an error.
 */
@Injectable()
export class SessionStateMiddleware implements NestMiddleware {
  /**
   * `@Inject` with the concrete class, not a structural `Pick<>`: Nest builds
   * middleware in the module that applies it, and a type-only parameter gives
   * the injector no token to resolve — the container then refuses to boot.
   */
  constructor(
    @Inject(AuthService)
    private readonly authService: Pick<
      AuthService,
      "readAccountState" | "readSessionFromCookieHeader"
    >,
  ) {}

  async use(request: RequestLike, _response: unknown, next: () => void) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      next();
      return;
    }

    const state = await this.authService.readAccountState(session.email);

    // A session whose account is gone is dead, but the handler's own 401 says
    // that better than a 403 would.
    if (!state) {
      next();
      return;
    }

    if (state.status === ACCOUNT_STATUS_SUSPENDED) {
      throw new ForbiddenException(SUSPENDED_ACCOUNT_MESSAGE);
    }

    if (
      state.sessionsValidFrom &&
      new Date(session.issuedAt).getTime() <
        new Date(state.sessionsValidFrom).getTime()
    ) {
      throw new ForbiddenException(REVOKED_SESSION_MESSAGE);
    }

    next();
  }
}

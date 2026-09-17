import { ForbiddenException, Injectable, type NestMiddleware } from "@nestjs/common";
import { ACCOUNT_STATUS_SUSPENDED } from "@cvforge/types";
import type { AuthService } from "./auth.service";

export const SUSPENDED_ACCOUNT_MESSAGE =
  "Votre compte est suspendu. Contactez le support pour le reactiver.";
export const REVOKED_SESSION_MESSAGE =
  "Votre session a ete revoquee. Reconnectez-vous pour continuer.";

type SessionChecker = Pick<
  AuthService,
  "readAccountState" | "readSessionFromCookieHeader"
>;

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
  constructor(private readonly authService: SessionChecker) {}

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

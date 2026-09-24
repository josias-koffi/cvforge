import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ACCOUNT_STATUS_ACTIVE,
  ACCOUNT_STATUS_SUSPENDED,
  leadIntentPath,
  type LeadIntent,
} from "@cvforge/types";
import { randomBytes } from "node:crypto";
import { SUSPENDED_ACCOUNT_MESSAGE } from "./session-messages";
import { SessionCookieCodec } from "./session-cookie";
import { InvitationFlow } from "./invitations";
import { buildMagicLink, normalizeRedirectTarget } from "./auth.links";
import {
  createConsentRecord,
  hashToken,
  isValidEmail,
  normalizeEmail,
} from "./auth.helpers";
import type { SerializedSessionCookie } from "./session-cookie";
import type {
  AuthAccountRecord,
  AuthAccountStore,
  AuthConfig,
  InvitationResponse,
  MagicLinkResponse,
} from "./auth.types";

/** Runs once an account exists for the first time; failures never block sign-in. */
export type AccountCreatedListener = (
  email: string,
) => Promise<unknown> | unknown;

/**
 * Runs when a link carrying a free tool's intent is redeemed, new account or
 * not; failures never block sign-in (US-133).
 */
export type LeadIntentListener = (
  email: string,
  intent: LeadIntent,
) => Promise<unknown> | unknown;

@Injectable()
export class AuthService {
  private readonly accountCreatedListeners: AccountCreatedListener[] = [];
  private readonly leadIntentListeners: LeadIntentListener[] = [];
  private readonly logger = new Logger(AuthService.name);
  private readonly sessionCookies: SessionCookieCodec;
  private readonly invitations: InvitationFlow;

  constructor(
    private readonly config: AuthConfig,
    private readonly accountStore: AuthAccountStore,
  ) {
    this.sessionCookies = new SessionCookieCodec(config);
    this.invitations = new InvitationFlow(
      config,
      accountStore,
      this.sessionCookies,
      (email) => this.notifyAccountCreated(email),
    );
  }

  /**
   * `intent` is what a free tool's visitor asked for: it travels with the link
   * and dies with it, and decides where the link opens the app (US-133).
   */
  async requestMagicLink(
    rawEmail: string,
    consentAccepted = false,
    intent: LeadIntent | null = null,
  ): Promise<MagicLinkResponse> {
    await this.pruneExpiredMagicLinks();

    const email = rawEmail.trim().toLowerCase();
    const existingAccount = await this.accountStore.readAccount(email);

    if (!isValidEmail(email)) {
      throw new BadRequestException("A valid email address is required.");
    }

    if (!existingAccount && !consentAccepted) {
      throw new BadRequestException(
        "Consent is required before creating an account.",
      );
    }

    // A suspended account keeps its data but gets no way back in.
    if (existingAccount?.status === ACCOUNT_STATUS_SUSPENDED) {
      throw new ForbiddenException(SUSPENDED_ACCOUNT_MESSAGE);
    }

    const token = randomBytes(24).toString("base64url");
    const expiresAt = Date.now() + this.config.magicLinkTtlMinutes * 60_000;

    await this.accountStore.saveMagicLink(hashToken(token), {
      consent: existingAccount?.consent ?? createConsentRecord("passwordless"),
      email,
      expiresAt: new Date(expiresAt).toISOString(),
      intent,
    });

    return {
      email,
      magicLink: buildMagicLink(
        this.config,
        token,
        intent ? leadIntentPath(intent) : null,
      ),
      expiresAt: new Date(expiresAt).toISOString(),
      sessionDurationDays: this.config.sessionTtlDays,
    };
  }

  /**
   * Lets a module that depends on auth react to sign-ups without auth
   * depending on it back. Two concurrent first sign-ins may both notify, so
   * listeners must be idempotent.
   */
  onAccountCreated(listener: AccountCreatedListener) {
    this.accountCreatedListeners.push(listener);
  }

  onLeadIntent(listener: LeadIntentListener) {
    this.leadIntentListeners.push(listener);
  }

  private notifyAccountCreated(email: string) {
    return this.notify("Account-created", this.accountCreatedListeners, email);
  }

  private async notify<Args extends unknown[]>(
    label: string,
    listeners: Array<(...args: Args) => unknown>,
    ...args: Args
  ) {
    for (const listener of listeners) {
      try {
        await listener(...args);
      } catch (error) {
        this.logger.error(
          `${label} listener failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  createInvitation(
    cookieHeader: string | undefined,
    rawEmail: string,
    rawRole: string | undefined,
  ): Promise<InvitationResponse> {
    return this.invitations.create(cookieHeader, rawEmail, rawRole);
  }

  previewInvitation(rawToken: string) {
    return this.invitations.preview(rawToken);
  }

  consumeInvitation(rawToken: string, consentAccepted = false) {
    return this.invitations.consume(rawToken, consentAccepted);
  }

  async consumeMagicLink(rawToken: string, redirectTo?: string) {
    await this.pruneExpiredMagicLinks();

    const token = rawToken.trim();

    if (!token) {
      throw new BadRequestException("A magic-link token is required.");
    }

    // Redeeming deletes the link in the same write, so a double click cannot
    // open two sessions.
    const link = await this.accountStore.consumeMagicLink(
      hashToken(token),
      Date.now(),
    );

    if (!link) {
      throw new UnauthorizedException("This magic link is invalid or expired.");
    }

    const isNewAccount = !(await this.accountStore.readAccount(link.email));
    const role = await this.accountStore.resolveRole(link.email, link.consent);

    if (isNewAccount) {
      await this.notifyAccountCreated(link.email);
    }

    // After the account exists, so a listener can write for it.
    if (link.intent) {
      await this.notify(
        "Lead-intent",
        this.leadIntentListeners,
        link.email,
        link.intent,
      );
    }

    const session = this.sessionCookies.createSession(link.email, role);

    return {
      redirectUrl: normalizeRedirectTarget(this.config, redirectTo),
      session,
      cookie: this.sessionCookies.serialize(session),
    };
  }

  readSessionFromCookieHeader(cookieHeader?: string) {
    return this.sessionCookies.read(cookieHeader);
  }

  clearSessionCookie(): SerializedSessionCookie {
    return this.sessionCookies.clear();
  }

  listAccounts(): Promise<AuthAccountRecord[]> {
    return this.accountStore.listAccounts();
  }

  readAccountState(email: string) {
    return this.accountStore.readAccountState(normalizeEmail(email));
  }

  /**
   * Suspends an account: it keeps every byte of its data, loses access, and
   * its live sessions die immediately (the stateless cookies are invalidated
   * by moving `sessionsValidFrom`, checked by `SessionStateMiddleware`).
   */
  async suspendAccount(rawEmail: string) {
    const email = normalizeEmail(rawEmail);
    const accounts = await this.accountStore.listAccounts();
    const target = accounts.find((account) => account.email === email);

    if (!target) {
      throw new NotFoundException("Utilisateur introuvable.");
    }

    const hasOtherActiveAdmin = accounts.some(
      (account) =>
        account.role === "admin" &&
        account.email !== email &&
        account.status !== ACCOUNT_STATUS_SUSPENDED,
    );

    if (target.role === "admin" && !hasOtherActiveAdmin) {
      throw new ConflictException(
        "Impossible de suspendre le dernier administrateur actif.",
      );
    }

    return (await this.accountStore.setAccountStatus(
      email,
      ACCOUNT_STATUS_SUSPENDED,
      new Date().toISOString(),
    )) as AuthAccountRecord;
  }

  /** Reactivation restores access but does not resurrect revoked cookies. */
  async reactivateAccount(rawEmail: string) {
    const email = normalizeEmail(rawEmail);
    const account = await this.accountStore.readAccount(email);

    if (!account) {
      throw new NotFoundException("Utilisateur introuvable.");
    }

    return (await this.accountStore.setAccountStatus(
      email,
      ACCOUNT_STATUS_ACTIVE,
      null,
    )) as AuthAccountRecord;
  }

  /** Force logout: every session issued before now is refused. */
  async revokeSessions(rawEmail: string) {
    const email = normalizeEmail(rawEmail);
    const account = await this.accountStore.readAccount(email);

    if (!account) {
      throw new NotFoundException("Utilisateur introuvable.");
    }

    return (await this.accountStore.revokeSessions(
      email,
      new Date().toISOString(),
    )) as AuthAccountRecord;
  }

  /**
   * Demotes an admin to `user`. Promotion is not offered here on purpose:
   * vision §3.2 makes the nominative invitation link (`createInvitation`) the
   * only way to grant `admin`, so no admin action may hand out the role.
   */
  async demoteAccountToUser(rawEmail: string, rawRole: string | undefined) {
    if (rawRole !== "user") {
      throw new BadRequestException(
        "Seule la retrogradation en utilisateur est possible. Le role administrateur s'accorde uniquement par lien d'invitation nominatif.",
      );
    }

    const email = normalizeEmail(rawEmail);
    const accounts = await this.accountStore.listAccounts();
    const target = accounts.find((account) => account.email === email);

    if (!target) {
      throw new NotFoundException("Utilisateur introuvable.");
    }

    const hasOtherAdmin = accounts.some(
      (account) => account.role === "admin" && account.email !== email,
    );

    if (target.role === "admin" && !hasOtherAdmin) {
      throw new ConflictException(
        "Impossible de retirer le dernier administrateur.",
      );
    }

    return (await this.accountStore.demoteToUser(email)) as AuthAccountRecord;
  }

  /**
   * Spent links are deleted on redemption; this only clears the ones nobody
   * ever clicked, so expired addresses do not linger in the table.
   */
  private async pruneExpiredMagicLinks() {
    try {
      await this.accountStore.purgeExpiredMagicLinks(Date.now());
    } catch (error) {
      // Housekeeping must never block a sign-in.
      this.logger.warn(
        `Could not purge expired magic links: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

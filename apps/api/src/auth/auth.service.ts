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
} from "@cvforge/types";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { SUSPENDED_ACCOUNT_MESSAGE } from "./session-messages";
import type {
  AuthConsentRecord,
  AuthAccountRecord,
  AuthAccountStore,
  AuthConfig,
  AuthInvitation,
  AuthRole,
  AuthSession,
  InvitationResponse,
  MagicLinkResponse,
} from "./auth.types";

/** Runs once an account exists for the first time; failures never block sign-in. */
export type AccountCreatedListener = (email: string) => Promise<unknown> | unknown;

type MagicLinkRecord = {
  consent: AuthConsentRecord | null;
  email: string;
  expiresAt: number;
  consumedAt: number | null;
};

type SerializedSessionCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

type SessionPayload = {
  email: string;
  role: AuthRole;
  issuedAt: string;
  expiresAt: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITATION_TTL_MS = 48 * 60 * 60 * 1000;
const CONSENT_VERSION = "2026-04-mvp";

@Injectable()
export class AuthService {
  private readonly magicLinks = new Map<string, MagicLinkRecord>();
  private readonly accountCreatedListeners: AccountCreatedListener[] = [];
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: AuthConfig,
    private readonly accountStore: AuthAccountStore,
  ) {}

  async requestMagicLink(
    rawEmail: string,
    consentAccepted = false,
  ): Promise<MagicLinkResponse> {
    this.pruneExpiredMagicLinks();

    const email = rawEmail.trim().toLowerCase();
    const existingAccount = await this.accountStore.readAccount(email);

    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException("A valid email address is required.");
    }

    if (!existingAccount && !consentAccepted) {
      throw new BadRequestException("Consent is required before creating an account.");
    }

    // A suspended account keeps its data but gets no way back in.
    if (existingAccount?.status === ACCOUNT_STATUS_SUSPENDED) {
      throw new ForbiddenException(SUSPENDED_ACCOUNT_MESSAGE);
    }

    const token = randomBytes(24).toString("base64url");
    const expiresAt = Date.now() + this.config.magicLinkTtlMinutes * 60_000;

    this.magicLinks.set(this.hashToken(token), {
      consent: existingAccount?.consent ?? this.createConsentRecord("passwordless"),
      email,
      expiresAt,
      consumedAt: null,
    });

    return {
      email,
      magicLink: this.buildMagicLink(token),
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

  private async notifyAccountCreated(email: string) {
    for (const listener of this.accountCreatedListeners) {
      try {
        await listener(email);
      } catch (error) {
        this.logger.error(
          `Account-created listener failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  async createInvitation(
    cookieHeader: string | undefined,
    rawEmail: string,
    rawRole: string | undefined,
  ): Promise<InvitationResponse> {
    const session = this.readSessionFromCookieHeader(cookieHeader);

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    if (session.role !== "admin") {
      throw new ForbiddenException("Only admins can create invitations.");
    }

    const email = this.normalizeEmail(rawEmail);
    const role = this.normalizeRole(rawRole);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + INVITATION_TTL_MS).toISOString();
    const token = randomBytes(24).toString("base64url");

    await this.accountStore.saveInvitation(this.hashToken(token), {
      consumedAt: null,
      createdAt: createdAt.toISOString(),
      createdBy: session.email,
      email,
      expiresAt,
      role,
    });

    return {
      email,
      role,
      invitationUrl: this.buildInvitationUrl(token),
      expiresAt,
    };
  }

  async previewInvitation(rawToken: string) {
    const invitation = await this.requireInvitation(rawToken);

    return {
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      role: invitation.role,
    };
  }

  async consumeInvitation(rawToken: string, consentAccepted = false) {
    const token = rawToken.trim();

    if (!token) {
      throw new BadRequestException("An invitation token is required.");
    }

    if (!consentAccepted) {
      throw new BadRequestException("Consent is required before accepting an invitation.");
    }

    const consumedAt = new Date().toISOString();
    const invitation = await this.accountStore.consumeInvitation(
      this.hashToken(token),
      consumedAt,
      Date.now(),
    );

    if (!invitation) {
      throw new UnauthorizedException("This invitation is invalid or expired.");
    }

    const isNewAccount = !(await this.accountStore.readAccount(invitation.email));
    const role = await this.accountStore.assignInvitedRole(
      invitation.email,
      invitation.role,
      this.createConsentRecord("invitation"),
    );

    if (isNewAccount) {
      await this.notifyAccountCreated(invitation.email);
    }

    const session = this.createSession(invitation.email, role);

    return {
      session,
      cookie: this.serializeSessionCookie(session),
    };
  }

  async consumeMagicLink(rawToken: string, redirectTo?: string) {
    this.pruneExpiredMagicLinks();

    const token = rawToken.trim();

    if (!token) {
      throw new BadRequestException("A magic-link token is required.");
    }

    const record = this.magicLinks.get(this.hashToken(token));

    if (!record || record.consumedAt !== null || record.expiresAt <= Date.now()) {
      throw new UnauthorizedException("This magic link is invalid or expired.");
    }

    record.consumedAt = Date.now();

    const isNewAccount = !(await this.accountStore.readAccount(record.email));
    const role = await this.accountStore.resolveRole(record.email, record.consent);

    if (isNewAccount) {
      await this.notifyAccountCreated(record.email);
    }

    const session = this.createSession(record.email, role);

    return {
      redirectUrl: this.normalizeRedirectTarget(redirectTo),
      session,
      cookie: this.serializeSessionCookie(session),
    };
  }

  readSessionFromCookieHeader(cookieHeader?: string) {
    const cookieValue = this.extractCookie(cookieHeader, this.config.cookieName);

    if (!cookieValue) {
      return null;
    }

    return this.verifySessionCookie(cookieValue);
  }

  clearSessionCookie(): SerializedSessionCookie {
    return {
      name: this.config.cookieName,
      value: "",
      options: {
        httpOnly: true,
        maxAge: 0,
        path: "/",
        sameSite: "lax",
        secure: this.config.secureCookies,
        ...(this.config.cookieDomain ? { domain: this.config.cookieDomain } : {}),
      },
    };
  }

  listAccounts(): Promise<AuthAccountRecord[]> {
    return this.accountStore.listAccounts();
  }

  readAccountState(email: string) {
    return this.accountStore.readAccountState(this.normalizeEmail(email));
  }

  /**
   * Suspends an account: it keeps every byte of its data, loses access, and
   * its live sessions die immediately (the stateless cookies are invalidated
   * by moving `sessionsValidFrom`, checked by `SessionStateMiddleware`).
   */
  async suspendAccount(rawEmail: string) {
    const email = this.normalizeEmail(rawEmail);
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
    const email = this.normalizeEmail(rawEmail);
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
    const email = this.normalizeEmail(rawEmail);
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

    const email = this.normalizeEmail(rawEmail);
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

  private buildMagicLink(token: string) {
    const loginSuccessUrl = new URL("/login/success", this.config.appUrl);
    const consumeUrl = new URL("/auth/passwordless/consume", this.config.apiUrl);

    consumeUrl.searchParams.set("token", token);
    consumeUrl.searchParams.set("redirectTo", loginSuccessUrl.toString());

    return consumeUrl.toString();
  }

  private buildInvitationUrl(token: string) {
    const invitationUrl = new URL("/register/invitation", this.config.appUrl);

    invitationUrl.searchParams.set("token", token);

    return invitationUrl.toString();
  }

  private createConsentRecord(source: AuthConsentRecord["source"]): AuthConsentRecord {
    return {
      acceptedAt: new Date().toISOString(),
      source,
      version: CONSENT_VERSION,
    };
  }

  private createSession(email: string, role: AuthRole): AuthSession {
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + this.config.sessionTtlDays * 24 * 60 * 60 * 1000,
    );

    return {
      email,
      role,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  private serializeSessionCookie(session: AuthSession): SerializedSessionCookie {
    const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
    const signature = this.sign(payload);

    return {
      name: this.config.cookieName,
      value: `${payload}.${signature}`,
      options: {
        httpOnly: true,
        maxAge: this.config.sessionTtlDays * 24 * 60 * 60 * 1000,
        path: "/",
        sameSite: "lax",
        secure: this.config.secureCookies,
        ...(this.config.cookieDomain ? { domain: this.config.cookieDomain } : {}),
      },
    };
  }

  private verifySessionCookie(value: string) {
    const [payload, signature] = value.split(".");

    if (!payload || !signature || !this.signaturesMatch(payload, signature)) {
      return null;
    }

    let session: SessionPayload;

    try {
      session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      return null;
    }

    if (!session.email || !session.expiresAt || !session.issuedAt) {
      return null;
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    return session satisfies AuthSession;
  }

  private normalizeRedirectTarget(redirectTo?: string) {
    if (!redirectTo) {
      return new URL("/login/success", this.config.appUrl).toString();
    }

    const allowedOrigin = new URL(this.config.appUrl).origin;

    try {
      const candidate = new URL(redirectTo, this.config.appUrl);

      if (candidate.origin !== allowedOrigin) {
        return new URL("/login", this.config.appUrl).toString();
      }

      return candidate.toString();
    } catch {
      return new URL("/login", this.config.appUrl).toString();
    }
  }

  private extractCookie(cookieHeader: string | undefined, cookieName: string) {
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(";");

    for (const cookie of cookies) {
      const [name, ...rest] = cookie.trim().split("=");

      if (name === cookieName) {
        return rest.join("=");
      }
    }

    return null;
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private normalizeEmail(rawEmail: string) {
    const email = rawEmail.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException("A valid email address is required.");
    }

    return email;
  }

  private normalizeRole(rawRole: string | undefined): AuthRole {
    if (rawRole === "admin" || rawRole === "user") {
      return rawRole;
    }

    throw new BadRequestException("Invitation role must be admin or user.");
  }

  private async requireInvitation(rawToken: string): Promise<AuthInvitation> {
    const token = rawToken.trim();

    if (!token) {
      throw new BadRequestException("An invitation token is required.");
    }

    const invitation = await this.accountStore.readInvitation(
      this.hashToken(token),
    );

    if (
      !invitation ||
      invitation.consumedAt !== null ||
      new Date(invitation.expiresAt).getTime() <= Date.now()
    ) {
      throw new UnauthorizedException("This invitation is invalid or expired.");
    }

    return invitation;
  }

  private sign(payload: string) {
    return createHmac("sha256", this.config.sessionSecret)
      .update(payload)
      .digest("base64url");
  }

  private signaturesMatch(payload: string, signature: string) {
    const expected = Buffer.from(this.sign(payload));
    const actual = Buffer.from(signature);

    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private pruneExpiredMagicLinks() {
    const now = Date.now();

    for (const [tokenHash, record] of this.magicLinks.entries()) {
      if (record.expiresAt <= now || record.consumedAt !== null) {
        this.magicLinks.delete(tokenHash);
      }
    }
  }
}
type CookieOptions = {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
};

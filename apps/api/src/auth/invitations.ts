import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import {
  createConsentRecord,
  hashToken,
  normalizeEmail,
  normalizeRole,
} from "./auth.helpers";
import type { SessionCookieCodec } from "./session-cookie";
import type {
  AuthAccountStore,
  AuthConfig,
  AuthInvitation,
  InvitationResponse,
} from "./auth.types";

const INVITATION_TTL_MS = 48 * 60 * 60 * 1000;

/**
 * The nominative invitation link. Vision §3.2 makes this the only way to grant
 * the `admin` role, so no admin action elsewhere may hand it out.
 */
export class InvitationFlow {
  constructor(
    private readonly config: Pick<AuthConfig, "appUrl">,
    private readonly accountStore: AuthAccountStore,
    private readonly sessionCookies: SessionCookieCodec,
    private readonly onAccountCreated: (email: string) => Promise<void>,
  ) {}

  async create(
    cookieHeader: string | undefined,
    rawEmail: string,
    rawRole: string | undefined,
  ): Promise<InvitationResponse> {
    const session = this.sessionCookies.read(cookieHeader);

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    if (session.role !== "admin") {
      throw new ForbiddenException("Only admins can create invitations.");
    }

    const email = normalizeEmail(rawEmail);
    const role = normalizeRole(rawRole);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + INVITATION_TTL_MS).toISOString();
    const token = randomBytes(24).toString("base64url");

    await this.accountStore.saveInvitation(hashToken(token), {
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

  async preview(rawToken: string) {
    const invitation = await this.requirePending(rawToken);

    return {
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      role: invitation.role,
    };
  }

  async consume(rawToken: string, consentAccepted = false) {
    const token = rawToken.trim();

    if (!token) {
      throw new BadRequestException("An invitation token is required.");
    }

    if (!consentAccepted) {
      throw new BadRequestException("Consent is required before accepting an invitation.");
    }

    const consumedAt = new Date().toISOString();
    const invitation = await this.accountStore.consumeInvitation(
      hashToken(token),
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
      createConsentRecord("invitation"),
    );

    if (isNewAccount) {
      await this.onAccountCreated(invitation.email);
    }

    const session = this.sessionCookies.createSession(invitation.email, role);

    return {
      session,
      cookie: this.sessionCookies.serialize(session),
    };
  }

  private buildInvitationUrl(token: string) {
    const invitationUrl = new URL("/register/invitation", this.config.appUrl);

    invitationUrl.searchParams.set("token", token);

    return invitationUrl.toString();
  }

  private async requirePending(rawToken: string): Promise<AuthInvitation> {
    const token = rawToken.trim();

    if (!token) {
      throw new BadRequestException("An invitation token is required.");
    }

    const invitation = await this.accountStore.readInvitation(hashToken(token));

    if (
      !invitation ||
      invitation.consumedAt !== null ||
      new Date(invitation.expiresAt).getTime() <= Date.now()
    ) {
      throw new UnauthorizedException("This invitation is invalid or expired.");
    }

    return invitation;
  }
}

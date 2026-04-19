import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type {
  AuthAccountStore,
  AuthConfig,
  AuthRole,
  AuthSession,
  MagicLinkResponse,
} from "./auth.types";

type MagicLinkRecord = {
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

@Injectable()
export class AuthService {
  private readonly magicLinks = new Map<string, MagicLinkRecord>();

  constructor(
    private readonly config: AuthConfig,
    private readonly accountStore: AuthAccountStore,
  ) {}

  requestMagicLink(rawEmail: string): MagicLinkResponse {
    this.pruneExpiredMagicLinks();

    const email = rawEmail.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      throw new BadRequestException("A valid email address is required.");
    }

    const token = randomBytes(24).toString("base64url");
    const expiresAt = Date.now() + this.config.magicLinkTtlMinutes * 60_000;

    this.magicLinks.set(this.hashToken(token), {
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

  consumeMagicLink(rawToken: string, redirectTo?: string) {
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

    const session = this.createSession(record.email);

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
      },
    };
  }

  private buildMagicLink(token: string) {
    const loginSuccessUrl = new URL("/login/success", this.config.appUrl);
    const consumeUrl = new URL("/auth/passwordless/consume", this.config.apiUrl);

    consumeUrl.searchParams.set("token", token);
    consumeUrl.searchParams.set("redirectTo", loginSuccessUrl.toString());

    return consumeUrl.toString();
  }

  private createSession(email: string): AuthSession {
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + this.config.sessionTtlDays * 24 * 60 * 60 * 1000,
    );
    const role = this.accountStore.resolveRole(email);

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

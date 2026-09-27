import { createHmac, timingSafeEqual } from "node:crypto";
import type { AuthConfig, AuthRole, AuthSession } from "./auth.types";

export type CookieOptions = {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
};

export type SerializedSessionCookie = {
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

type SessionCookieConfig = Pick<
  AuthConfig,
  "cookieDomain" | "cookieName" | "secureCookies" | "sessionSecret" | "sessionTtlDays"
>;

/**
 * Mints, reads and clears the stateless session cookie. Sessions are a signed
 * payload with no server-side record — revocation is handled separately, by
 * `SessionStateMiddleware` against the account's `sessionsValidFrom`.
 */
export class SessionCookieCodec {
  constructor(private readonly config: SessionCookieConfig) {}

  createSession(email: string, role: AuthRole): AuthSession {
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

  serialize(session: AuthSession): SerializedSessionCookie {
    const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
    const signature = this.sign(payload);

    return {
      name: this.config.cookieName,
      value: `${payload}.${signature}`,
      options: this.cookieOptions(this.config.sessionTtlDays * 24 * 60 * 60 * 1000),
    };
  }

  clear(): SerializedSessionCookie {
    return {
      name: this.config.cookieName,
      value: "",
      options: this.cookieOptions(0),
    };
  }

  /**
   * Reads the session out of a `Cookie` header.
   *
   * A browser sends one entry per stored cookie, so a leftover of the same name
   * from another domain or path travels alongside the current one — and RFC 6265
   * puts the older entry first. Taking the first match therefore let a stale
   * cookie shadow the valid session on *every* request, with no way out but
   * clearing cookies by hand. So every candidate is tried, and the first one
   * that actually verifies wins.
   */
  read(cookieHeader?: string): AuthSession | null {
    for (const value of this.candidateValues(cookieHeader)) {
      const session = this.verify(value);

      if (session) {
        return session;
      }
    }

    return null;
  }

  private cookieOptions(maxAge: number): CookieOptions {
    return {
      httpOnly: true,
      maxAge,
      path: "/",
      sameSite: "lax",
      secure: this.config.secureCookies,
      ...(this.config.cookieDomain ? { domain: this.config.cookieDomain } : {}),
    };
  }

  private candidateValues(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return [];
    }

    return cookieHeader
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([name]) => name === this.config.cookieName)
      .map(([, ...rest]) => rest.join("="));
  }

  private verify(value: string): AuthSession | null {
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
}

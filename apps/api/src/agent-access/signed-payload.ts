import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * `<base64url JSON>.<HMAC>` tokens: download links and pending OAuth
 * authorizations. Each use derives its own key from the session secret, so a
 * token signed for one purpose never passes for another.
 */
export class SignedPayload {
  private readonly key: Buffer;

  constructor(sessionSecret: string, purpose: string) {
    this.key = createHmac("sha256", sessionSecret).update(purpose).digest();
  }

  sign(payload: object) {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");

    return `${body}.${this.mac(body)}`;
  }

  /** The payload, or null when the token is malformed or its signature wrong. */
  read<T>(token: string): T | null {
    const [body, signature, extra] = token.split(".");

    if (!body || !signature || extra !== undefined) {
      return null;
    }

    const expected = Buffer.from(this.mac(body));
    const actual = Buffer.from(signature);

    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      return null;
    }

    try {
      return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
    } catch {
      return null;
    }
  }

  private mac(body: string) {
    return createHmac("sha256", this.key).update(body).digest("base64url");
  }
}

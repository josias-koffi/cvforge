import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SIGNED_FILE_TTL_MS = 10 * 60 * 1000;

export type SignedFileKind = "cv" | "letter";
export type SignedFileFormat = "pdf" | "docx";

export type SignedFileClaim = {
  userEmail: string;
  applicationId: string;
  kind: SignedFileKind;
  format: SignedFileFormat;
  expiresAt: number;
  nonce: string;
};

/**
 * Short-lived, single-use download links for the agent (ADR-032 §8): the
 * agent saves the PDF with `curl` and uploads it through the browser. The
 * link carries no cookie and no agent token, so it is bound to the account
 * by its signature, expires in 10 minutes and works once.
 *
 * "Used" nonces are kept in memory: the API runs as one instance. They are
 * pruned once expired, since an expired link is refused anyway.
 */
export class SignedFiles {
  private readonly used = new Map<string, number>();
  private readonly key: Buffer;

  constructor(
    sessionSecret: string,
    private readonly baseUrl: string,
    private readonly clock: () => number = () => Date.now(),
  ) {
    // A key of its own, so a link signature can never pass for a session one.
    this.key = createHmac("sha256", sessionSecret)
      .update("agent-signed-files")
      .digest();
  }

  issue(claim: Omit<SignedFileClaim, "expiresAt" | "nonce">) {
    const expiresAt = this.clock() + SIGNED_FILE_TTL_MS;
    const payload = Buffer.from(
      JSON.stringify({
        ...claim,
        expiresAt,
        nonce: randomBytes(12).toString("base64url"),
      }),
    ).toString("base64url");
    const token = `${payload}.${this.sign(payload)}`;

    return {
      expiresAt: new Date(expiresAt).toISOString(),
      url: `${this.baseUrl.replace(/\/$/, "")}/mcp/files/${token}`,
    };
  }

  /** The claim, once; null when forged, expired or already used. */
  redeem(token: string): SignedFileClaim | null {
    const [payload, signature, extra] = token.split(".");

    if (
      !payload ||
      !signature ||
      extra !== undefined ||
      !this.signatureMatches(payload, signature)
    ) {
      return null;
    }

    let claim: SignedFileClaim;

    try {
      claim = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8"),
      ) as SignedFileClaim;
    } catch {
      return null;
    }

    const now = this.clock();
    this.prune(now);

    if (claim.expiresAt <= now || this.used.has(claim.nonce)) {
      return null;
    }

    this.used.set(claim.nonce, claim.expiresAt);

    return claim;
  }

  private sign(payload: string) {
    return createHmac("sha256", this.key).update(payload).digest("base64url");
  }

  private signatureMatches(payload: string, signature: string) {
    const expected = Buffer.from(this.sign(payload));
    const actual = Buffer.from(signature);

    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  private prune(now: number) {
    for (const [nonce, expiresAt] of this.used) {
      if (expiresAt <= now) this.used.delete(nonce);
    }
  }
}

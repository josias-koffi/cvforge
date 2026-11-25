import { randomBytes } from "node:crypto";
import { SignedPayload } from "../signed-payload";

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
  private readonly signer: SignedPayload;

  constructor(
    sessionSecret: string,
    private readonly baseUrl: string,
    private readonly clock: () => number = () => Date.now(),
  ) {
    this.signer = new SignedPayload(sessionSecret, "agent-signed-files");
  }

  issue(claim: Omit<SignedFileClaim, "expiresAt" | "nonce">) {
    const expiresAt = this.clock() + SIGNED_FILE_TTL_MS;
    const token = this.signer.sign({
      ...claim,
      expiresAt,
      nonce: randomBytes(12).toString("base64url"),
    });

    return {
      expiresAt: new Date(expiresAt).toISOString(),
      url: `${this.baseUrl.replace(/\/$/, "")}/mcp/files/${token}`,
    };
  }

  /** The claim, once; null when forged, expired or already used. */
  redeem(token: string): SignedFileClaim | null {
    const claim = this.signer.read<SignedFileClaim>(token);

    if (!claim) {
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

  private prune(now: number) {
    for (const [nonce, expiresAt] of this.used) {
      if (expiresAt <= now) this.used.delete(nonce);
    }
  }
}

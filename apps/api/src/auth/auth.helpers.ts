import { BadRequestException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { AuthConsentRecord, AuthRole } from "./auth.types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONSENT_VERSION = "2026-04-mvp";

export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email);
}

/** Tokens are stored hashed: a leaked table cannot be replayed as links. */
export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();

  if (!isValidEmail(email)) {
    throw new BadRequestException("A valid email address is required.");
  }

  return email;
}

export function normalizeRole(rawRole: string | undefined): AuthRole {
  if (rawRole === "admin" || rawRole === "user") {
    return rawRole;
  }

  throw new BadRequestException("Invitation role must be admin or user.");
}

export function createConsentRecord(
  source: AuthConsentRecord["source"],
): AuthConsentRecord {
  return {
    acceptedAt: new Date().toISOString(),
    source,
    version: CONSENT_VERSION,
  };
}

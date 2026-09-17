import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { requireAdminSession, requireSession } from "./request-session";

function reader(session: unknown) {
  return { readSessionFromCookieHeader: vi.fn().mockReturnValue(session) };
}

const request = { headers: { cookie: "cvforge_session=abc" } };

describe("request-session", () => {
  it("returns the session of an authenticated request", () => {
    const session = { email: "user@example.com", role: "user" };

    expect(requireSession(reader(session), request)).toBe(session);
  });

  it("rejects anonymous requests and non-admin sessions", () => {
    expect(() => requireSession(reader(null), request)).toThrow(UnauthorizedException);
    expect(() =>
      requireAdminSession(reader({ email: "user@example.com", role: "user" }), request),
    ).toThrow(ForbiddenException);
    expect(
      requireAdminSession(reader({ email: "admin@example.com", role: "admin" }), request).role,
    ).toBe("admin");
  });
});

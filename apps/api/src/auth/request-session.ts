import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { AuthService } from "./auth.service";

export type CookieRequest = {
  headers: { cookie?: string };
};

type SessionReader = Pick<AuthService, "readSessionFromCookieHeader">;

export function requireSession(authService: SessionReader, request: CookieRequest) {
  const session = authService.readSessionFromCookieHeader(request.headers.cookie);

  if (!session) {
    throw new UnauthorizedException("A valid session is required.");
  }

  return session;
}

export function requireAdminSession(
  authService: SessionReader,
  request: CookieRequest,
) {
  const session = requireSession(authService, request);

  if (session.role !== "admin") {
    throw new ForbiddenException("Admin access is required.");
  }

  return session;
}

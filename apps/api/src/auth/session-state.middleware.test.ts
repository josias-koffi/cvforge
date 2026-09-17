import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_STATUS_ACTIVE,
  ACCOUNT_STATUS_SUSPENDED,
} from "@cvforge/types";
import type { AuthService } from "./auth.service";
import { SessionStateMiddleware } from "./session-state.middleware";

const ISSUED_AT = "2026-09-17T10:00:00.000Z";

function createMiddleware({
  sessionsValidFrom = null as string | null,
  session = { email: "user@example.com", issuedAt: ISSUED_AT, role: "user" } as
    | { email: string; issuedAt: string; role: string }
    | null,
  state = "present" as "present" | "missing",
  status = ACCOUNT_STATUS_ACTIVE as string,
} = {}) {
  const authService = {
    readAccountState: vi
      .fn()
      .mockResolvedValue(
        state === "missing" ? null : { sessionsValidFrom, status },
      ),
    readSessionFromCookieHeader: vi.fn().mockReturnValue(session),
  } as unknown as AuthService;

  return {
    authService,
    middleware: new SessionStateMiddleware(authService),
    next: vi.fn(),
  };
}

const request = { headers: { cookie: "cvforge_session=abc" } };

describe("SessionStateMiddleware", () => {
  it("lets an active account through", async () => {
    const { middleware, next } = createMiddleware();

    await middleware.use(request, null, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("passes an anonymous request straight through without touching the database", async () => {
    const { authService, middleware, next } = createMiddleware({ session: null });

    await middleware.use({ headers: {} }, null, next);

    expect(next).toHaveBeenCalledOnce();
    expect(authService.readAccountState).not.toHaveBeenCalled();
  });

  it("refuses a suspended account", async () => {
    const { middleware, next } = createMiddleware({
      status: ACCOUNT_STATUS_SUSPENDED,
    });

    await expect(middleware.use(request, null, next)).rejects.toThrow(
      ForbiddenException,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("refuses a session issued before the revocation", async () => {
    const { middleware, next } = createMiddleware({
      sessionsValidFrom: "2026-09-17T11:00:00.000Z",
    });

    await expect(middleware.use(request, null, next)).rejects.toThrow(
      /revoquee/i,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a session issued after the revocation", async () => {
    const { middleware, next } = createMiddleware({
      sessionsValidFrom: "2026-09-17T09:00:00.000Z",
    });

    await middleware.use(request, null, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("leaves the handler to answer when the account no longer exists", async () => {
    const { middleware, next } = createMiddleware({ state: "missing" });

    await middleware.use(request, null, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

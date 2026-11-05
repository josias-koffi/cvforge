import { HttpException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { Public } from "./public.decorator";
import { MemoryRateLimitStore } from "../shared/rate-limit/rate-limit.memory-store";
import { UserRateLimit } from "../shared/rate-limit/user-rate-limit.decorator";
import { SessionGuard } from "./session.guard";

class PrivateController {
  handler() {}
}

@Public()
class PublicController {
  handler() {}
}

class MixedController {
  @Public()
  open() {}
  closed() {}
}

function contextFor(controller: new () => object, method: string, cookie?: string) {
  return {
    getClass: () => controller,
    getHandler: () => (controller.prototype as Record<string, () => void>)[method],
    switchToHttp: () => ({
      getRequest: () => ({ headers: { cookie } }),
      getResponse: () => ({ setHeader: () => undefined }),
    }),
  } as unknown as ExecutionContext;
}

class MeteredController {
  @UserRateLimit("costly", 2, 3)
  costly() {}
}

function guardWith(session: object | null, store = new MemoryRateLimitStore(), now = () => 1_000_000) {
  const authService = { readSessionFromCookieHeader: vi.fn().mockReturnValue(session) };
  return new SessionGuard(new Reflector(), authService as never, store, now);
}

describe("SessionGuard", () => {
  it("should refuse an anonymous request on a route not marked public", () => {
    expect(() => guardWith(null).canActivate(contextFor(PrivateController, "handler"))).toThrow(
      UnauthorizedException,
    );
    expect(() => guardWith(null).canActivate(contextFor(MixedController, "closed"))).toThrow(
      UnauthorizedException,
    );
  });

  it("should let a valid session through", () => {
    expect(guardWith({ email: "a@example.com" }).canActivate(contextFor(PrivateController, "handler"))).toBe(true);
  });

  it("should let anonymous requests reach a public handler or controller", () => {
    expect(guardWith(null).canActivate(contextFor(PublicController, "handler"))).toBe(true);
    expect(guardWith(null).canActivate(contextFor(MixedController, "open"))).toBe(true);
  });

  it("should cap an account's calls to a metered route, per account", () => {
    const store = new MemoryRateLimitStore();
    const alice = guardWith({ email: "alice@example.com" }, store);
    const bob = guardWith({ email: "bob@example.com" }, store);
    const context = contextFor(MeteredController, "costly");

    expect(alice.canActivate(context)).toBe(true);
    expect(alice.canActivate(context)).toBe(true);
    expect(() => alice.canActivate(context)).toThrow(HttpException);
    try {
      alice.canActivate(context);
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(429);
    }
    expect(bob.canActivate(context)).toBe(true);
  });

  it("should free the allowance when the window has passed", () => {
    const store = new MemoryRateLimitStore();
    let clock = 1_000_000;
    const guard = guardWith({ email: "a@example.com" }, store, () => clock);
    const context = contextFor(MeteredController, "costly");

    guard.canActivate(context);
    guard.canActivate(context);
    expect(() => guard.canActivate(context)).toThrow();

    clock += 61 * 60 * 1000;

    expect(guard.canActivate(context)).toBe(true);
  });
});

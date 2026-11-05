import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { Public } from "./public.decorator";
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
    switchToHttp: () => ({ getRequest: () => ({ headers: { cookie } }) }),
  } as unknown as ExecutionContext;
}

function guardWith(session: object | null) {
  const authService = { readSessionFromCookieHeader: vi.fn().mockReturnValue(session) };
  return new SessionGuard(new Reflector(), authService as never);
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
});

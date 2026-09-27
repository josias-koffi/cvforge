import type { LeadIntent } from "@cvforge/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";
import type { AuthConfig } from "./auth.types";
import { createInMemoryAccountStore } from "./testing/in-memory-account-store";

const config: AuthConfig = {
  apiUrl: "http://localhost:3333",
  appUrl: "http://localhost:3000",
  cookieDomain: undefined,
  cookieName: "cvforge_session",
  magicLinkTtlMinutes: 15,
  secureCookies: false,
  sessionSecret: "test-secret",
  sessionTtlDays: 7,
};

const SCAN_ID = "3f2b8c1e-5d4a-4b6f-9a8e-1c2d3e4f5a6b";
const INTENT: LeadIntent = { kind: "ats_scan", scanId: SCAN_ID };

function tokenOf(magicLink: string) {
  return new URL(magicLink).searchParams.get("token") ?? "";
}

function loginSuccessOf(magicLink: string) {
  return new URL(new URL(magicLink).searchParams.get("redirectTo") ?? "");
}

/** A free tool's visitor, carried by their magic link (US-133). */
describe("AuthService — lead intents", () => {
  let service: AuthService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T12:00:00.000Z"));
    service = new AuthService(config, createInMemoryAccountStore());
  });

  it("opens the app on the tool's screen", async () => {
    const { magicLink } = await service.requestMagicLink(
      "lead@example.com",
      true,
      INTENT,
    );

    const target = loginSuccessOf(magicLink);

    expect(target.pathname).toBe("/login/success");
    expect(target.searchParams.get("next")).toBe(`/analyses-ats/${SCAN_ID}`);
  });

  it("keeps the plain sign-in link without an intent", async () => {
    const { magicLink } = await service.requestMagicLink(
      "lead@example.com",
      true,
    );

    expect(loginSuccessOf(magicLink).searchParams.has("next")).toBe(false);
  });

  it("hands the intent to listeners on redemption, once the account exists", async () => {
    const listener = vi.fn();
    const created = vi.fn();
    service.onAccountCreated(created);
    service.onLeadIntent(listener);

    const { magicLink } = await service.requestMagicLink(
      "lead@example.com",
      true,
      INTENT,
    );
    await service.consumeMagicLink(tokenOf(magicLink));

    expect(listener).toHaveBeenCalledWith("lead@example.com", INTENT);
    expect(created.mock.invocationCallOrder[0]!).toBeLessThan(
      listener.mock.invocationCallOrder[0]!,
    );
  });

  /** `onAccountCreated` alone would miss someone who already had an account. */
  it("applies the intent for an existing account too", async () => {
    const plain = await service.requestMagicLink("lead@example.com", true);
    await service.consumeMagicLink(tokenOf(plain.magicLink));
    const listener = vi.fn();
    service.onLeadIntent(listener);

    const { magicLink } = await service.requestMagicLink(
      "lead@example.com",
      true,
      INTENT,
    );
    await service.consumeMagicLink(tokenOf(magicLink));

    expect(listener).toHaveBeenCalledWith("lead@example.com", INTENT);
  });

  it("does not call listeners for a link without intent", async () => {
    const listener = vi.fn();
    service.onLeadIntent(listener);

    const { magicLink } = await service.requestMagicLink(
      "lead@example.com",
      true,
    );
    await service.consumeMagicLink(tokenOf(magicLink));

    expect(listener).not.toHaveBeenCalled();
  });

  it("still signs in when a listener fails", async () => {
    service.onLeadIntent(() => {
      throw new Error("offer import down");
    });

    const { magicLink } = await service.requestMagicLink(
      "lead@example.com",
      true,
      INTENT,
    );
    const consumed = await service.consumeMagicLink(tokenOf(magicLink));

    expect(consumed.session.email).toBe("lead@example.com");
  });
});

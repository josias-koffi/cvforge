import {
  ATS_SCORE_ENGINE_VERSION,
  type AtsScoreResult,
} from "@cvforge/ats-score";
import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthMailerService } from "../auth/auth-mailer.service";
import type { AuthService } from "../auth/auth.service";
import { LeadCaptureService } from "../leads/lead-capture.service";
import { AtsUnlockService } from "./ats-unlock.service";
import { InMemoryAtsScanStore } from "./testing/in-memory-ats-store";

const RESULT: AtsScoreResult = {
  band: "good",
  dimensions: [{ key: "structure", score: 80, status: "scored" }],
  engineVersion: ATS_SCORE_ENGINE_VERSION,
  findings: [
    {
      code: "MISSING_QUANTIFICATION",
      dimension: "impact",
      severity: "critical",
    },
  ],
  llmApplied: false,
  overallScore: 72,
};

describe("AtsUnlockService", () => {
  let store: InMemoryAtsScanStore;
  let authService: { requestMagicLink: ReturnType<typeof vi.fn> };
  let authMailer: { sendMagicLinkEmail: ReturnType<typeof vi.fn> };
  let service: AtsUnlockService;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    store = new InMemoryAtsScanStore();
    authService = {
      requestMagicLink: vi.fn().mockResolvedValue({
        email: "lead@example.com",
        expiresAt: new Date().toISOString(),
        magicLink: "https://app.local/login?token=x",
        sessionDurationDays: 7,
      }),
    };
    authMailer = { sendMagicLinkEmail: vi.fn().mockResolvedValue(undefined) };
    consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    service = new AtsUnlockService(
      store,
      new LeadCaptureService(
        authService as unknown as AuthService,
        authMailer as unknown as AuthMailerService,
      ),
    );
  });

  async function seedScan(expiresInMs = 30 * 24 * 3600 * 1000) {
    return store.create({
      expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
      ipHash: null,
      locale: "fr",
      result: RESULT,
      source: "public",
    });
  }

  function unlockRequest(scanId: string, overrides = {}) {
    return {
      consentAccepted: true,
      email: "lead@example.com",
      scanId,
      ...overrides,
    };
  }

  describe("what the visitor gets", () => {
    /** The report is returned here, not in an inbox: the detour loses people. */
    it("returns the full report in the response", async () => {
      const scan = await seedScan();

      const response = await service.unlock(unlockRequest(scan.id));

      expect(response.result).toEqual(RESULT);
      expect(response.result.dimensions).toHaveLength(1);
      expect(response.result.findings).toHaveLength(1);
      expect(response.scanId).toBe(scan.id);
    });

    it("sends the magic link alongside", async () => {
      const scan = await seedScan();

      const response = await service.unlock(unlockRequest(scan.id));

      // The link carries the scan, so it opens this report in the app (US-133).
      expect(authService.requestMagicLink).toHaveBeenCalledWith(
        "lead@example.com",
        true,
        { kind: "ats_scan", scanId: scan.id },
      );
      expect(authMailer.sendMagicLinkEmail).toHaveBeenCalledTimes(1);
      expect(response.magicLinkSent).toBe(true);
    });

    it("records the lead against the scan", async () => {
      const scan = await seedScan();

      await service.unlock(unlockRequest(scan.id));

      const stored = await store.findById(scan.id);

      expect(stored?.email).toBe("lead@example.com");
      expect(stored?.unlockedAt).not.toBeNull();
    });

    it("normalises the address before storing it", async () => {
      const scan = await seedScan();

      await service.unlock(
        unlockRequest(scan.id, { email: "  LEAD@Example.COM " }),
      );

      expect((await store.findById(scan.id))?.email).toBe("lead@example.com");
    });
  });

  describe("what it refuses", () => {
    it("requires a valid email", async () => {
      const scan = await seedScan();

      await expect(
        service.unlock(unlockRequest(scan.id, { email: "not-an-email" })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    /** Sending the link creates an account, so consent is explicit. */
    it("requires explicit consent", async () => {
      const scan = await seedScan();

      await expect(
        service.unlock(unlockRequest(scan.id, { consentAccepted: false })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("sends nothing and stores nothing when it refuses", async () => {
      const scan = await seedScan();

      await service
        .unlock(unlockRequest(scan.id, { consentAccepted: false }))
        .catch(() => undefined);

      expect(authService.requestMagicLink).not.toHaveBeenCalled();
      expect((await store.findById(scan.id))?.email).toBeNull();
    });

    it("404s on an unknown scan", async () => {
      await expect(
        service.unlock(unlockRequest("00000000-0000-4000-8000-000000000000")),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("names an unknown and an expired scan with a code", async () => {
      const expired = await seedScan(-1000);

      await expect(
        service.unlock(unlockRequest("00000000-0000-4000-8000-000000000000")),
      ).rejects.toMatchObject({ response: { code: "SCAN_NOT_FOUND" } });
      await expect(
        service.unlock(unlockRequest(expired.id)),
      ).rejects.toMatchObject({
        response: { code: "SCAN_EXPIRED" },
      });
    });

    it("410s on a scan past its retention deadline", async () => {
      const scan = await seedScan(-1000);

      await expect(
        service.unlock(unlockRequest(scan.id)),
      ).rejects.toBeInstanceOf(GoneException);
    });
  });

  /**
   * An anonymous caller must not be able to learn whether an address has an
   * account here. `requestMagicLink` throws 403 for a suspended account and 400
   * for an unknown one without consent, so those failures are swallowed.
   */
  describe("account enumeration", () => {
    it("answers identically when the address belongs to a suspended account", async () => {
      const scan = await seedScan();
      authService.requestMagicLink.mockRejectedValue(
        new ForbiddenException("Account suspended"),
      );

      const response = await service.unlock(unlockRequest(scan.id));

      expect(response.result).toEqual(RESULT);
      expect(response.magicLinkSent).toBe(true);
    });

    it("answers identically when delivery fails outright", async () => {
      const scan = await seedScan();
      authMailer.sendMagicLinkEmail.mockRejectedValue(new Error("SMTP down"));

      const response = await service.unlock(unlockRequest(scan.id));

      expect(response.result).toEqual(RESULT);
    });

    it("logs the failure rather than swallowing it silently", async () => {
      const scan = await seedScan();
      authService.requestMagicLink.mockRejectedValue(new Error("boom"));

      await service.unlock(unlockRequest(scan.id));

      expect(consoleError).toHaveBeenCalled();
    });

    it("still releases the report when the link cannot be sent", async () => {
      const scan = await seedScan();
      authService.requestMagicLink.mockRejectedValue(new Error("boom"));

      const response = await service.unlock(unlockRequest(scan.id));

      expect(response.result).toEqual(RESULT);
    });
  });

  describe("replaying the request", () => {
    it("returns the report again without erroring", async () => {
      const scan = await seedScan();

      await service.unlock(unlockRequest(scan.id));
      const second = await service.unlock(unlockRequest(scan.id));

      expect(second.result).toEqual(RESULT);
    });

    /** A replay must not redirect a released report to another address. */
    it("does not move the report to a different address", async () => {
      const scan = await seedScan();

      await service.unlock(unlockRequest(scan.id));
      await service.unlock(
        unlockRequest(scan.id, { email: "attacker@example.com" }),
      );

      expect((await store.findById(scan.id))?.email).toBe("lead@example.com");
    });
  });
});

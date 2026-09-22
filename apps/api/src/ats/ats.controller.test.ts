import "reflect-metadata";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AtsScanService } from "./ats-scan.service";
import type { AtsUnlockService } from "./ats-unlock.service";
import { PublicAtsScanController } from "./ats.controller";
import type { CvSourceFile } from "../cv-generation/cv-text-extraction";
import { AtsModule } from "./ats.module";

const FILE: CvSourceFile = {
  buffer: Buffer.from("%PDF-1.4"),
  mimetype: "application/pdf",
  originalname: "cv.pdf",
  size: 8,
};

describe("PublicAtsScanController", () => {
  let scanService: { scanPublic: ReturnType<typeof vi.fn> };
  let unlockService: { unlock: ReturnType<typeof vi.fn> };
  let controller: PublicAtsScanController;

  beforeEach(() => {
    scanService = { scanPublic: vi.fn().mockResolvedValue({ scanId: "abc" }) };
    unlockService = { unlock: vi.fn().mockResolvedValue({ scanId: "abc" }) };
    controller = new PublicAtsScanController(
      scanService as unknown as AtsScanService,
      unlockService as unknown as AtsUnlockService,
    );
  });

  function unlockArgOf() {
    return unlockService.unlock.mock.calls[0]?.[0] as Record<string, unknown>;
  }

  function requestFrom(ip: string) {
    return { headers: { "x-forwarded-for": ip } };
  }

  function argOf() {
    return scanService.scanPublic.mock.calls[0]?.[0] as Record<string, unknown>;
  }

  it("hands the upload to the service", async () => {
    await controller.scan(FILE, {}, requestFrom("203.0.113.7"));

    expect(argOf().file).toBe(FILE);
  });

  it("passes a missing file through, for the service to refuse", async () => {
    await controller.scan(undefined, {}, requestFrom("203.0.113.7"));

    expect(argOf().file).toBeUndefined();
  });

  it("reads the caller from the first hop of X-Forwarded-For", async () => {
    await controller.scan(
      FILE,
      {},
      { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } },
    );

    expect(argOf().ip).toBe("203.0.113.7");
  });

  describe("the locale", () => {
    it("accepts English", async () => {
      await controller.scan(FILE, { locale: "en" }, requestFrom("203.0.113.7"));

      expect(argOf().locale).toBe("en");
    });

    /** Anything unrecognised is French, never echoed back into a row. */
    it("falls back to French for anything else", async () => {
      await controller.scan(FILE, { locale: "de" }, requestFrom("203.0.113.7"));

      expect(argOf().locale).toBe("fr");
    });

    it("falls back to French when none is given", async () => {
      await controller.scan(FILE, {}, requestFrom("203.0.113.7"));

      expect(argOf().locale).toBe("fr");
    });
  });

  describe("the pasted offer", () => {
    it("forwards it when there is one", async () => {
      await controller.scan(
        FILE,
        { offerText: "  Ingénieur plateforme  " },
        requestFrom("203.0.113.7"),
      );

      expect(argOf().offerText).toBe("Ingénieur plateforme");
    });

    it("forwards null when there is none", async () => {
      await controller.scan(FILE, {}, requestFrom("203.0.113.7"));

      expect(argOf().offerText).toBeNull();
    });

    it("ignores an offer that is not a string", async () => {
      await controller.scan(
        FILE,
        { offerText: { nested: true } },
        requestFrom("203.0.113.7"),
      );

      expect(argOf().offerText).toBeNull();
    });
  });

  describe("unlocking", () => {
    it("passes the scan id, the email and the consent through", async () => {
      await controller.unlock("scan-1", {
        consentAccepted: true,
        email: "lead@example.com",
      });

      expect(unlockArgOf()).toEqual({
        consentAccepted: true,
        email: "lead@example.com",
        scanId: "scan-1",
      });
    });

    /** Consent must be an explicit `true`, never a truthy value. */
    it("treats anything but true as consent withheld", async () => {
      await controller.unlock("scan-1", {
        consentAccepted: "yes",
        email: "lead@example.com",
      });

      expect(unlockArgOf().consentAccepted).toBe(false);
    });

    it("treats a missing consent as withheld", async () => {
      await controller.unlock("scan-1", { email: "lead@example.com" });

      expect(unlockArgOf().consentAccepted).toBe(false);
    });

    it("turns a non-string email into an empty one, for the service to refuse", async () => {
      await controller.unlock("scan-1", {
        consentAccepted: true,
        email: { nested: true },
      });

      expect(unlockArgOf().email).toBe("");
    });
  });

  it("is mounted on the public scan route", () => {
    expect(Reflect.getMetadata("path", PublicAtsScanController)).toBe(
      "public/ats-scan",
    );
  });

  it("is registered by AtsModule", () => {
    const controllers = Reflect.getMetadata("controllers", AtsModule) as
      | unknown[]
      | undefined;

    expect(controllers).toContain(PublicAtsScanController);
  });
});

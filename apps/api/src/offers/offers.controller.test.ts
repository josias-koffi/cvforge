import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AuthService } from "../auth/auth.service";
import {
  AdminCreditOffersController,
  PublicCreditOffersController,
} from "./offers.controller";
import type { CreditOffersService } from "./offers.service";
import { offerInput } from "./testing/offer-fixtures";

function makeService() {
  return {
    archive: vi.fn().mockResolvedValue({ offer: { id: "o1" }, stripeSyncError: null }),
    create: vi.fn().mockResolvedValue({ offer: { id: "o1" }, stripeSyncError: null }),
    feature: vi.fn().mockResolvedValue({ id: "o1", isFeatured: true }),
    listForAdmin: vi.fn().mockResolvedValue([{ id: "o1" }]),
    listPublic: vi.fn().mockResolvedValue([{ id: "o1" }]),
    syncAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({ offer: { id: "o1" }, stripeSyncError: null }),
  };
}

function makeAdminController(role: "admin" | "user" = "admin") {
  const service = makeService();
  const authService = {
    readSessionFromCookieHeader: vi.fn().mockReturnValue({ email: "a@example.com", role }),
  };

  return {
    controller: new AdminCreditOffersController(
      service as unknown as CreditOffersService,
      authService as unknown as AuthService,
    ),
    service,
  };
}

const request = { headers: { cookie: "cvforge_session=abc" } };

describe("AdminCreditOffersController", () => {
  it("lets an admin manage offers", async () => {
    const { controller, service } = makeAdminController();

    await expect(controller.list(request)).resolves.toEqual({ offers: [{ id: "o1" }] });
    await controller.create(offerInput(), request);
    await controller.update("o1", offerInput({ priceCents: 999 }), request);
    await expect(controller.feature("o1", request)).resolves.toEqual({
      offer: { id: "o1", isFeatured: true },
    });
    await controller.archive("o1", request);
    await expect(controller.syncStripe(request)).resolves.toEqual({ results: [] });

    expect(service.create).toHaveBeenCalledWith(offerInput());
    expect(service.update).toHaveBeenCalledWith("o1", offerInput({ priceCents: 999 }));
    expect(service.archive).toHaveBeenCalledWith("o1");
  });

  it("validates payloads before touching the service", () => {
    const { controller, service } = makeAdminController();

    expect(() => controller.create({ slug: "x" }, request)).toThrow(BadRequestException);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("forbids non-admin sessions", async () => {
    const { controller } = makeAdminController("user");

    await expect(controller.list(request)).rejects.toBeInstanceOf(ForbiddenException);
    expect(() => controller.create(offerInput(), request)).toThrow(ForbiddenException);
  });
});

describe("PublicCreditOffersController", () => {
  it("serves the active catalogue without a session", async () => {
    const service = makeService();
    const controller = new PublicCreditOffersController(service as unknown as CreditOffersService);

    await expect(controller.list()).resolves.toEqual({ offers: [{ id: "o1" }] });
  });
});

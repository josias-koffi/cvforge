import type { RomeAppellationOption } from "@cvforge/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadCaptureService } from "../leads/lead-capture.service";
import { PublicJobMarketController } from "./job-market.controller";
import { JobMarketService } from "./job-market.service";

const DEV: RomeAppellationOption = {
  code: "38874",
  libelle: "Développeur / Développeuse web",
  metierCode: "M1855",
  metierLibelle: "Développement web",
};

describe("PublicJobMarketController — lead", () => {
  let requestMagicLink: ReturnType<typeof vi.fn>;
  let sendMagicLinkEmail: ReturnType<typeof vi.fn>;
  let controller: PublicJobMarketController;

  beforeEach(() => {
    requestMagicLink = vi.fn().mockResolvedValue({ magicLink: "x" });
    sendMagicLinkEmail = vi.fn().mockResolvedValue(undefined);
    controller = new PublicJobMarketController(
      new JobMarketService(
        {
          find: async (code) => (code === DEV.code ? DEV : null),
          search: async () => [],
        },
        { lookup: async () => null },
      ),
      new LeadCaptureService(
        { requestMagicLink } as never,
        { sendMagicLinkEmail } as never,
      ),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("sends a magic link carrying the job and the department", async () => {
    await expect(
      controller.lead({
        appellation: "38874",
        consentAccepted: true,
        department: "44",
        email: " Lead@Example.com ",
      }),
    ).resolves.toEqual({ magicLinkSent: true });

    expect(requestMagicLink).toHaveBeenCalledWith("lead@example.com", true, {
      appellationCode: "38874",
      department: "44",
      kind: "job_search",
    });
    expect(sendMagicLinkEmail).toHaveBeenCalledTimes(1);
  });

  /** No enumeration: a suspended account answers like any other address. */
  it("answers the same when the link cannot be sent", async () => {
    requestMagicLink.mockRejectedValue(new Error("suspended"));

    await expect(
      controller.lead({
        appellation: "38874",
        consentAccepted: true,
        department: "44",
        email: "a@b.fr",
      }),
    ).resolves.toEqual({ magicLinkSent: true });
  });

  it.each([
    [{ appellation: "38874", consentAccepted: true, department: "44", email: "nope" }, "INVALID_EMAIL"],
    [{ appellation: "38874", consentAccepted: false, department: "44", email: "a@b.fr" }, "CONSENT_REQUIRED"],
    [{ appellation: "1", consentAccepted: true, department: "44", email: "a@b.fr" }, "ROME_APPELLATION_UNKNOWN"],
    [{ appellation: "38874", consentAccepted: true, department: "00", email: "a@b.fr" }, "DEPARTMENT_UNKNOWN"],
  ])("refuses %j with %s and sends nothing", async (body, code) => {
    await expect(controller.lead(body)).rejects.toMatchObject({
      response: { code },
    });
    expect(requestMagicLink).not.toHaveBeenCalled();
  });
});

describe("PublicJobMarketController — reads", () => {
  it("wraps the suggestions and hands the query to the service", async () => {
    const service = {
      read: vi.fn().mockResolvedValue({ status: "collecting" }),
      suggest: vi.fn().mockResolvedValue([DEV]),
    } as unknown as JobMarketService;
    const controller = new PublicJobMarketController(service, {} as never);

    expect(await controller.suggest("dév")).toEqual({ appellations: [DEV] });
    expect(await controller.read("38874", "44")).toEqual({
      status: "collecting",
    });
    expect(service.read).toHaveBeenCalledWith({
      appellation: "38874",
      department: "44",
    });
  });
});

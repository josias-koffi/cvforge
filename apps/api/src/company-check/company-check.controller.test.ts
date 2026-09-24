import { describe, expect, it, vi } from "vitest";
import { LeadCaptureService } from "../leads/lead-capture.service";
import { PublicCompanyCheckController } from "./company-check.controller";
import { CompanyCheckService } from "./company-check.service";

function controller() {
  const requestMagicLink = vi.fn().mockResolvedValue({ magicLink: "x" });
  const sources = {
    egaproScore: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
  };

  return {
    controller: new PublicCompanyCheckController(
      new CompanyCheckService(sources, { findMany: vi.fn() }),
      new LeadCaptureService(
        { requestMagicLink } as never,
        { sendMagicLinkEmail: vi.fn().mockResolvedValue(undefined) } as never,
      ),
    ),
    requestMagicLink,
    sources,
  };
}

describe("PublicCompanyCheckController", () => {
  it("searches and reads through the service", async () => {
    const { controller: check, sources } = controller();

    await expect(check.search("helpline")).resolves.toEqual({ matches: [] });
    await expect(check.read("381983568")).resolves.toEqual({ status: "unknown" });
    expect(sources.search).toHaveBeenCalledTimes(2);
  });

  it("sends a magic link carrying the SIREN, without asking the Annuaire", async () => {
    const { controller: check, requestMagicLink, sources } = controller();

    await expect(
      check.lead({ consentAccepted: true, email: "a@b.fr", siren: " 381983568 " }),
    ).resolves.toEqual({ magicLinkSent: true });
    expect(requestMagicLink).toHaveBeenCalledWith(
      "a@b.fr",
      true,
      { kind: "company", siren: "381983568" },
    );
    expect(sources.search).not.toHaveBeenCalled();
  });

  it("refuses a lead without consent before reading the SIREN", async () => {
    const { controller: check, requestMagicLink } = controller();

    await expect(
      check.lead({ consentAccepted: false, email: "a@b.fr", siren: "381983568" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(requestMagicLink).not.toHaveBeenCalled();
  });
});

import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PublicCompanyPagesController } from "./company-pages.controller";
import { CompanyPagesService } from "./company-pages.service";

describe("PublicCompanyPagesController", () => {
  it("lists the pages and serves one through the service", async () => {
    const pages = {
      hiring: vi.fn(),
      listIndexable: vi.fn().mockResolvedValue([]),
      listIndexableByNaf: vi.fn(),
    };
    const controller = new PublicCompanyPagesController(
      new CompanyPagesService({ findMany: vi.fn().mockResolvedValue([]) }, pages),
    );

    await expect(controller.list()).resolves.toEqual({ pages: [] });
    expect(pages.listIndexable).toHaveBeenCalledWith(4_500);
    await expect(controller.page("381983568")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

import { Controller, Get, Inject, Param } from "@nestjs/common";
import type { CompanyPageEntry, PublicCompanyPage } from "@cvforge/types";
import { CompanyPagesService } from "./company-pages.service";

/**
 * The company pages of the landing (US-140). Read by the landing's server
 * when it renders or revalidates a page, not by visitors: left out of the
 * rate limit, like `public/market-pages` (ADR-022). Reads its copy only.
 */
@Controller("public/company-pages")
export class PublicCompanyPagesController {
  constructor(
    @Inject(CompanyPagesService) private readonly pages: CompanyPagesService,
  ) {}

  @Get()
  async list(): Promise<{ pages: CompanyPageEntry[] }> {
    return { pages: await this.pages.list() };
  }

  @Get(":siren")
  page(@Param("siren") siren: string): Promise<PublicCompanyPage> {
    return this.pages.page(siren);
  }
}

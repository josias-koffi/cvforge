import { Controller, Get, Inject, Param } from "@nestjs/common";
import type { MarketPageEntry, PublicMarketPage } from "@cvforge/types";
import { MarketPagesService } from "./market-pages.service";

/**
 * The job × department pages of the landing (US-138). Read by the landing's
 * server when it renders or revalidates a page, not by visitors: left out of
 * the rate limit, like `public/legal` (ADR-022). Reads only, nothing queued.
 */
@Controller("public/market-pages")
export class PublicMarketPagesController {
  constructor(
    @Inject(MarketPagesService) private readonly pages: MarketPagesService,
  ) {}

  @Get()
  async list(): Promise<{ pages: MarketPageEntry[] }> {
    return { pages: await this.pages.list() };
  }

  @Get(":romeCode/:department")
  page(
    @Param("romeCode") romeCode: string,
    @Param("department") department: string,
  ): Promise<PublicMarketPage> {
    return this.pages.page(romeCode, department);
  }
}

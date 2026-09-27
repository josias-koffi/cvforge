import {
  Controller,
  Get,
  Header,
  Inject,
  Query,
  Req,
  StreamableFile,
} from "@nestjs/common";
import type {
  AcquisitionMetrics,
  AiCostMetrics,
  MarketMetrics,
  OverviewMetrics,
  RevenueMetrics,
  UsageMetrics,
} from "@cvforge/types";
import { OPENROUTER_BALANCE_SERVICE } from "../ai/openrouter.module";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import { AuthService } from "../auth/auth.service";
import { requireAdminSession, type CookieRequest } from "../auth/request-session";
import { CockpitService } from "./cockpit.service";
import { buildMetricsCsv, buildMetricsCsvFilename } from "./metrics-csv";
import type { OpenRouterBalanceResponse } from "./metrics.types";
import { parsePeriod, resolveWindow } from "./shared/metrics-window";

/**
 * The admin cockpit (E26): one route per tab, each over `?period=`. Every
 * route checks the admin session itself, as the rest of the admin API does.
 */
@Controller("admin/metrics")
export class AdminMetricsController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(OPENROUTER_BALANCE_SERVICE)
    private readonly balanceService: OpenRouterBalanceService,
    @Inject(CockpitService) private readonly cockpit: CockpitService,
  ) {}

  private windowFor(request: CookieRequest, period: unknown) {
    requireAdminSession(this.authService, request);
    return resolveWindow(parsePeriod(period));
  }

  @Get("overview")
  async readOverview(@Req() request: CookieRequest, @Query("period") period?: string): Promise<OverviewMetrics> {
    return this.cockpit.overview.read(this.windowFor(request, period));
  }

  @Get("revenue")
  async readRevenue(@Req() request: CookieRequest, @Query("period") period?: string): Promise<RevenueMetrics> {
    return this.cockpit.revenue.read(this.windowFor(request, period));
  }

  @Get("ai-costs")
  async readAiCosts(@Req() request: CookieRequest, @Query("period") period?: string): Promise<AiCostMetrics> {
    return this.cockpit.aiCosts.read(this.windowFor(request, period));
  }

  @Get("usage")
  async readUsage(@Req() request: CookieRequest, @Query("period") period?: string): Promise<UsageMetrics> {
    return this.cockpit.usage.read(this.windowFor(request, period));
  }

  @Get("market")
  async readMarket(@Req() request: CookieRequest, @Query("period") period?: string): Promise<MarketMetrics> {
    return this.cockpit.market.read(this.windowFor(request, period));
  }

  @Get("acquisition")
  async readAcquisition(@Req() request: CookieRequest, @Query("period") period?: string): Promise<AcquisitionMetrics> {
    return this.cockpit.acquisition.read(this.windowFor(request, period));
  }

  @Get("export.csv")
  @Header("Cache-Control", "no-store")
  async exportMetricsCsv(@Req() request: CookieRequest, @Query("period") period?: string) {
    const window = this.windowFor(request, period);
    const snapshot = await this.cockpit.snapshot(window);

    return new StreamableFile(Buffer.from(buildMetricsCsv(snapshot), "utf8"), {
      disposition: `attachment; filename="${buildMetricsCsvFilename(snapshot.overview.window.generatedAt, window.period)}"`,
      type: "text/csv; charset=utf-8",
    });
  }

  /**
   * `supervisionEnabled: false` means no management key is configured, not a
   * failure — the front shows the feature as off rather than broken.
   */
  @Get("openrouter-balance")
  async readOpenRouterBalance(
    @Req() request: CookieRequest,
  ): Promise<OpenRouterBalanceResponse> {
    requireAdminSession(this.authService, request);

    const balance = await this.balanceService.getBalance();
    const alertThreshold = this.balanceService.alertThreshold;

    return {
      alertThreshold,
      balance,
      isLowBalance: balance ? balance.remaining < alertThreshold : false,
      supervisionEnabled: this.balanceService.isEnabled,
    };
  }
}

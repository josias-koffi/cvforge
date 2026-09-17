import { Controller, Get, Header, Inject, Req, StreamableFile } from "@nestjs/common";
import { OPENROUTER_BALANCE_SERVICE } from "../ai/openrouter.module";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import { AuthService } from "../auth/auth.service";
import { requireAdminSession, type CookieRequest } from "../auth/request-session";
import { buildMetricsCsv, buildMetricsCsvFilename } from "./metrics-csv";
import { MetricsService } from "./metrics.service";
import type { AdminMetrics, OpenRouterBalanceResponse } from "./metrics.types";

@Controller("admin/metrics")
export class AdminMetricsController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(OPENROUTER_BALANCE_SERVICE)
    private readonly balanceService: OpenRouterBalanceService,
    @Inject(MetricsService) private readonly metricsService: MetricsService,
  ) {}

  @Get()
  async readMetrics(@Req() request: CookieRequest): Promise<AdminMetrics> {
    requireAdminSession(this.authService, request);

    return this.metricsService.readAdminMetrics();
  }

  @Get("export.csv")
  @Header("Cache-Control", "no-store")
  async exportMetricsCsv(@Req() request: CookieRequest) {
    requireAdminSession(this.authService, request);

    const metrics = await this.metricsService.readAdminMetrics();

    return new StreamableFile(Buffer.from(buildMetricsCsv(metrics), "utf8"), {
      disposition: `attachment; filename="${buildMetricsCsvFilename(metrics.generatedAt)}"`,
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

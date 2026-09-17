import { Controller, Get, Inject, Req } from "@nestjs/common";
import { OPENROUTER_BALANCE_SERVICE } from "../ai/openrouter.module";
import type { OpenRouterBalanceService } from "../ai/openrouter-balance.service";
import { AuthService } from "../auth/auth.service";
import { requireAdminSession, type CookieRequest } from "../auth/request-session";
import type { OpenRouterBalanceResponse } from "./metrics.types";

@Controller("admin/metrics")
export class AdminMetricsController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(OPENROUTER_BALANCE_SERVICE)
    private readonly balanceService: OpenRouterBalanceService,
  ) {}

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

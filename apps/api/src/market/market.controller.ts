import {
  Controller,
  Get,
  Inject,
  Param,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { MarketStatsService } from "./market-stats.service";

type RequestLike = {
  headers: { cookie?: string };
};

/**
 * The labour market around a search (US-128). Reads the monthly copy only:
 * showing the page never calls France Travail.
 */
@Controller("profiles/:profileId/market")
export class MarketController {
  constructor(
    @Inject(MarketStatsService) private readonly market: MarketStatsService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  /** Every query is scoped to the session's e-mail: another's profile reads empty. */
  @Get()
  async readRadar(
    @Param("profileId") profileId: string,
    @Req() request: RequestLike,
  ) {
    const session = this.authService.readSessionFromCookieHeader(
      request.headers.cookie,
    );

    if (!session) {
      throw new UnauthorizedException("A valid session is required.");
    }

    return { entries: await this.market.radar(session.email, profileId) };
  }
}

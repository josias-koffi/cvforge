import { Module } from "@nestjs/common";
import { LeadsModule } from "../leads/leads.module";
import { MarketModule } from "../market/market.module";
import { MarketStatsService } from "../market/market-stats.service";
import {
  ROME_APPELLATIONS,
  type RomeAppellationsReader,
} from "../rome/rome-appellations.pg-reader";
import { RomeModule } from "../rome/rome.module";
import { PublicJobMarketController } from "./job-market.controller";
import { JobMarketService } from "./job-market.service";

/** The free "does this job hire near me?" tool of the landing (US-137). */
@Module({
  controllers: [PublicJobMarketController],
  imports: [LeadsModule, MarketModule, RomeModule],
  providers: [
    {
      inject: [ROME_APPELLATIONS, MarketStatsService],
      provide: JobMarketService,
      useFactory: (
        appellations: RomeAppellationsReader,
        market: MarketStatsService,
      ) => new JobMarketService(appellations, market),
    },
  ],
})
export class JobMarketModule {}

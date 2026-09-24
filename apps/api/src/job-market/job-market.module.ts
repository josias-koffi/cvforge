import { Module } from "@nestjs/common";
import { LeadsModule } from "../leads/leads.module";
import { MarketModule } from "../market/market.module";
import {
  MARKET_STATS_STORE,
  type MarketStatsStore,
} from "../market/market-stats.pg-store";
import { MarketStatsService } from "../market/market-stats.service";
import {
  ROME_APPELLATIONS,
  type RomeAppellationsReader,
} from "../rome/rome-appellations.pg-reader";
import { RomeModule } from "../rome/rome.module";
import { PublicJobMarketController } from "./job-market.controller";
import { JobMarketService } from "./job-market.service";
import { PublicMarketPagesController } from "./market-pages.controller";
import { MarketPagesService } from "./market-pages.service";

/**
 * The free "does this job hire near me?" tool of the landing (US-137), and
 * its job × department pages (US-138).
 */
@Module({
  controllers: [PublicJobMarketController, PublicMarketPagesController],
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
    {
      inject: [MARKET_STATS_STORE, ROME_APPELLATIONS],
      provide: MarketPagesService,
      useFactory: (
        store: MarketStatsStore,
        appellations: RomeAppellationsReader,
      ) => new MarketPagesService(store, appellations),
    },
  ],
})
export class JobMarketModule {}

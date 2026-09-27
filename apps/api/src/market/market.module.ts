import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { FranceTravailModule } from "../france-travail/france-travail.module";
import { FtHttpClient } from "../france-travail/ft-http.client";
import { SearchProjectsModule } from "../search-projects/search-projects.module";
import {
  SEARCH_PROJECTS_STORE,
  type SearchProjectsStore,
} from "../search-projects/search-projects.types";
import { MarketController } from "./market.controller";
import { MarketStatsClient } from "./market-stats.client";
import {
  MARKET_STATS_STORE,
  PgMarketStatsStore,
  type MarketStatsStore,
} from "./market-stats.pg-store";
import { MarketStatsService } from "./market-stats.service";

/** The labour market radar, from France Travail's Marché du travail API (US-128). */
@Module({
  controllers: [MarketController],
  exports: [MarketStatsService, MARKET_STATS_STORE],
  imports: [AuthModule, FranceTravailModule, SearchProjectsModule],
  providers: [
    {
      inject: [DATABASE],
      provide: MARKET_STATS_STORE,
      useFactory: (db: Database) => new PgMarketStatsStore(db),
    },
    {
      inject: [FtHttpClient],
      provide: MarketStatsClient,
      useFactory: (franceTravail: FtHttpClient) =>
        new MarketStatsClient(franceTravail),
    },
    {
      inject: [MARKET_STATS_STORE, MarketStatsClient, SEARCH_PROJECTS_STORE],
      provide: MarketStatsService,
      useFactory: (
        store: MarketStatsStore,
        client: MarketStatsClient,
        searchProjects: SearchProjectsStore,
      ) => new MarketStatsService(store, client, searchProjects),
    },
  ],
})
export class MarketModule {}

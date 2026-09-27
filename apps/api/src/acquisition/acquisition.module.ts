import { Module } from "@nestjs/common";
import { DATABASE, type Database } from "../database/database.types";
import { resolveIpHashSecret } from "../shared/ip-hash";
import { AcquisitionEventsService } from "./acquisition-events.service";
import { AcquisitionPurgeService } from "./acquisition-purge.service";
import { PgAcquisitionEventStore } from "./acquisition.pg-store";
import { PublicAcquisitionEventsController } from "./acquisition.controller";
import {
  ACQUISITION_EVENT_STORE,
  type AcquisitionEventStore,
} from "./acquisition.types";
import { PgToolQueryStore } from "./tool-queries.pg-store";
import { ToolQueriesService } from "./tool-queries.service";
import { TOOL_QUERY_STORE, type ToolQueryStore } from "./tool-queries.types";

@Module({
  controllers: [PublicAcquisitionEventsController],
  providers: [
    {
      provide: ACQUISITION_EVENT_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgAcquisitionEventStore(db),
    },
    {
      provide: AcquisitionEventsService,
      inject: [ACQUISITION_EVENT_STORE],
      useFactory: (store: AcquisitionEventStore) =>
        new AcquisitionEventsService(store, resolveIpHashSecret()),
    },
    {
      provide: TOOL_QUERY_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgToolQueryStore(db),
    },
    {
      provide: ToolQueriesService,
      inject: [TOOL_QUERY_STORE],
      useFactory: (store: ToolQueryStore) => new ToolQueriesService(store),
    },
    {
      provide: AcquisitionPurgeService,
      inject: [ACQUISITION_EVENT_STORE, TOOL_QUERY_STORE],
      useFactory: (store: AcquisitionEventStore, toolQueries: ToolQueryStore) =>
        new AcquisitionPurgeService(store, Date.now, toolQueries),
    },
  ],
  // The free tools count their searches through it (US-155).
  exports: [ToolQueriesService],
})
export class AcquisitionModule {}

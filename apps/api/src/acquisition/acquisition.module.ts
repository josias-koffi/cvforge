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
      provide: AcquisitionPurgeService,
      inject: [ACQUISITION_EVENT_STORE],
      useFactory: (store: AcquisitionEventStore) =>
        new AcquisitionPurgeService(store),
    },
  ],
})
export class AcquisitionModule {}

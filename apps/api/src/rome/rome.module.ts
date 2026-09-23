import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { FranceTravailModule } from "../france-travail/france-travail.module";
import { FtHttpClient } from "../france-travail/ft-http.client";
import {
  PgRomeAppellationsReader,
  ROME_APPELLATIONS,
} from "./rome-appellations.pg-reader";
import { RomeReferentialClient } from "./rome-referential.client";
import { RomeController } from "./rome.controller";
import { RomeoClient } from "./romeo.client";
import { RomeSyncService } from "./rome-sync.service";
import { PgRomeStore } from "./rome.pg-store";
import { ROME_STORE, type RomeCodeHolder, type RomeStore } from "./rome.types";

/**
 * The tables that store ROME codes for users and must follow a substitution.
 * Each feature that stores a code declares it here.
 */
export const ROME_CODE_HOLDERS: readonly RomeCodeHolder[] = [
  {
    column: "appellation_code",
    entity: "appellation",
    scope: ["user_email", "profile_id"],
    table: "search_project_rome",
  },
];

/** The local ROME 4.0 referential, its weekly sync, and ROMEO (ADR-024). */
@Module({
  controllers: [RomeController],
  exports: [ROME_STORE, ROME_APPELLATIONS, RomeoClient],
  imports: [AuthModule, FranceTravailModule],
  providers: [
    {
      inject: [DATABASE],
      provide: ROME_APPELLATIONS,
      useFactory: (db: Database) => new PgRomeAppellationsReader(db),
    },
    {
      inject: [FtHttpClient],
      provide: RomeoClient,
      useFactory: (franceTravail: FtHttpClient) =>
        new RomeoClient(franceTravail),
    },
    {
      inject: [DATABASE],
      provide: ROME_STORE,
      useFactory: (db: Database) => new PgRomeStore(db),
    },
    {
      inject: [FtHttpClient],
      provide: RomeReferentialClient,
      useFactory: (franceTravail: FtHttpClient) =>
        new RomeReferentialClient(franceTravail),
    },
    {
      inject: [ROME_STORE, RomeReferentialClient],
      provide: RomeSyncService,
      useFactory: (store: RomeStore, client: RomeReferentialClient) =>
        new RomeSyncService(store, client, ROME_CODE_HOLDERS),
    },
  ],
})
export class RomeModule {}

import { Module } from "@nestjs/common";
import { DATABASE, type Database } from "../database/database.types";
import { FranceTravailModule } from "../france-travail/france-travail.module";
import { FtHttpClient } from "../france-travail/ft-http.client";
import { RomeReferentialClient } from "./rome-referential.client";
import { RomeSyncService } from "./rome-sync.service";
import { PgRomeStore } from "./rome.pg-store";
import { ROME_STORE, type RomeCodeHolder, type RomeStore } from "./rome.types";

/**
 * The tables that store ROME codes for users and must follow a substitution.
 * Empty until the search project stores its confirmed appellations (US-118,
 * `search_project_rome`); each feature that stores a code declares it here.
 */
export const ROME_CODE_HOLDERS: readonly RomeCodeHolder[] = [];

/** The local ROME 4.0 referential and its weekly sync (ADR-024, US-123). */
@Module({
  exports: [ROME_STORE],
  imports: [FranceTravailModule],
  providers: [
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

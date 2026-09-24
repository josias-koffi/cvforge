import { Module } from "@nestjs/common";
import { DATABASE, type Database } from "../database/database.types";
import {
  COMPANIES_STORE,
  PgCompaniesStore,
  type CompaniesStore,
} from "./companies.pg-store";
import { CompaniesService } from "./companies.service";
import { CompanySources } from "./company-sources";

/**
 * The companies behind the hiring establishments (US-121): SIREN, record and
 * commitments, from the Annuaire des entreprises and Egapro.
 */
@Module({
  exports: [CompaniesService],
  providers: [
    {
      inject: [DATABASE],
      provide: COMPANIES_STORE,
      useFactory: (db: Database) => new PgCompaniesStore(db),
    },
    {
      inject: [COMPANIES_STORE],
      provide: CompaniesService,
      useFactory: (store: CompaniesStore) =>
        new CompaniesService(store, new CompanySources()),
    },
  ],
})
export class CompaniesModule {}

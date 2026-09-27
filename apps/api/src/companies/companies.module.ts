import { Module } from "@nestjs/common";
import { DATABASE, type Database } from "../database/database.types";
import { FranceTravailModule } from "../france-travail/france-travail.module";
import { FtHttpClient } from "../france-travail/ft-http.client";
import {
  COMPANIES_STORE,
  PgCompaniesStore,
  type CompaniesStore,
} from "./companies.pg-store";
import { CompaniesService } from "./companies.service";
import { CompanySources } from "./company-sources";
import { EmployerPagesSource } from "./employer-pages.source";
import { WikidataLogosSource } from "./wikidata-logos.source";

/**
 * The companies behind the hiring establishments (US-121): SIREN, record and
 * commitments, from the Annuaire des entreprises and Egapro, and its France
 * Travail employer page (US-116).
 */
@Module({
  exports: [CompaniesService, COMPANIES_STORE],
  imports: [FranceTravailModule],
  providers: [
    {
      inject: [DATABASE],
      provide: COMPANIES_STORE,
      useFactory: (db: Database) => new PgCompaniesStore(db),
    },
    {
      inject: [COMPANIES_STORE, FtHttpClient],
      provide: CompaniesService,
      useFactory: (store: CompaniesStore, franceTravail: FtHttpClient) =>
        new CompaniesService(
          store,
          new CompanySources(),
          new EmployerPagesSource(franceTravail),
          new WikidataLogosSource(),
        ),
    },
  ],
})
export class CompaniesModule {}

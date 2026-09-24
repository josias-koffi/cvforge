import { Module } from "@nestjs/common";
import { ApplicationsModule } from "../applications/applications.module";
import {
  APPLICATIONS_STORE,
  type ApplicationsStore,
} from "../applications/applications.types";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { FranceTravailModule } from "../france-travail/france-travail.module";
import { FtHttpClient } from "../france-travail/ft-http.client";
import { SearchProjectsModule } from "../search-projects/search-projects.module";
import {
  SEARCH_PROJECTS_STORE,
  type SearchProjectsStore,
} from "../search-projects/search-projects.types";
import { HiringCompaniesController } from "./hiring-companies.controller";
import {
  HIRING_COMPANIES_STORE,
  PgHiringCompaniesStore,
  type HiringCompaniesStore,
} from "./hiring-companies.pg-store";
import { HiringCompaniesService } from "./hiring-companies.service";
import { LaBonneBoiteSource } from "./la-bonne-boite.source";

/**
 * "Entreprises qui recrutent", from France Travail's La Bonne Boîte (US-119),
 * and the spontaneous applications made from it (US-120).
 */
@Module({
  controllers: [HiringCompaniesController],
  exports: [HiringCompaniesService],
  imports: [
    ApplicationsModule,
    AuthModule,
    FranceTravailModule,
    SearchProjectsModule,
  ],
  providers: [
    {
      inject: [DATABASE],
      provide: HIRING_COMPANIES_STORE,
      useFactory: (db: Database) => new PgHiringCompaniesStore(db),
    },
    {
      inject: [FtHttpClient],
      provide: LaBonneBoiteSource,
      useFactory: (franceTravail: FtHttpClient) =>
        new LaBonneBoiteSource(franceTravail),
    },
    {
      inject: [
        HIRING_COMPANIES_STORE,
        LaBonneBoiteSource,
        SEARCH_PROJECTS_STORE,
        APPLICATIONS_STORE,
      ],
      provide: HiringCompaniesService,
      useFactory: (
        store: HiringCompaniesStore,
        source: LaBonneBoiteSource,
        searchProjects: SearchProjectsStore,
        applications: ApplicationsStore,
      ) =>
        new HiringCompaniesService(store, source, searchProjects, applications),
    },
  ],
})
export class HiringCompaniesModule {}

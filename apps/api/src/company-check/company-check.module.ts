import { Module } from "@nestjs/common";
import {
  COMPANIES_STORE,
  type CompaniesStore,
} from "../companies/companies.pg-store";
import { CompaniesModule } from "../companies/companies.module";
import { CompanySources } from "../companies/company-sources";
import { DATABASE, type Database } from "../database/database.types";
import { LeadsModule } from "../leads/leads.module";
import { PublicCompanyCheckController } from "./company-check.controller";
import { CompanyCheckService } from "./company-check.service";
import { PublicCompanyPagesController } from "./company-pages.controller";
import {
  COMPANY_PAGES_STORE,
  PgCompanyPagesStore,
  type CompanyPagesStore,
} from "./company-pages.pg-store";
import { CompanyPagesService } from "./company-pages.service";

/**
 * The free "check an employer" tool of the landing (US-139). Its own
 * `CompanySources`, so its own pace of 2 calls a second: added to the hourly
 * refresh's 2, it stays under the 5 a second the Annuaire answered 429 at.
 * And its company pages (US-140), read from the refresh's copy.
 */
@Module({
  controllers: [PublicCompanyCheckController, PublicCompanyPagesController],
  imports: [CompaniesModule, LeadsModule],
  providers: [
    {
      inject: [COMPANIES_STORE],
      provide: CompanyCheckService,
      useFactory: (store: CompaniesStore) =>
        new CompanyCheckService(new CompanySources(), store),
    },
    {
      inject: [DATABASE],
      provide: COMPANY_PAGES_STORE,
      useFactory: (db: Database) => new PgCompanyPagesStore(db),
    },
    {
      inject: [COMPANIES_STORE, COMPANY_PAGES_STORE],
      provide: CompanyPagesService,
      useFactory: (companies: CompaniesStore, pages: CompanyPagesStore) =>
        new CompanyPagesService(companies, pages),
    },
  ],
})
export class CompanyCheckModule {}

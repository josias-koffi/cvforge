import { Module } from "@nestjs/common";
import {
  COMPANIES_STORE,
  type CompaniesStore,
} from "../companies/companies.pg-store";
import { CompaniesModule } from "../companies/companies.module";
import { CompanySources } from "../companies/company-sources";
import { LeadsModule } from "../leads/leads.module";
import { PublicCompanyCheckController } from "./company-check.controller";
import { CompanyCheckService } from "./company-check.service";

/**
 * The free "check an employer" tool of the landing (US-139). Its own
 * `CompanySources`, so its own pace of 2 calls a second: added to the hourly
 * refresh's 2, it stays under the 5 a second the Annuaire answered 429 at.
 */
@Module({
  controllers: [PublicCompanyCheckController],
  imports: [CompaniesModule, LeadsModule],
  providers: [
    {
      inject: [COMPANIES_STORE],
      provide: CompanyCheckService,
      useFactory: (store: CompaniesStore) =>
        new CompanyCheckService(new CompanySources(), store),
    },
  ],
})
export class CompanyCheckModule {}

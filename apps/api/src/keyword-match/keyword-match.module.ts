import { Module } from "@nestjs/common";
import { LeadsModule } from "../leads/leads.module";
import { PublicKeywordMatchController } from "./keyword-match.controller";
import { KeywordMatchService } from "./keyword-match.service";

/**
 * The free CV ↔ offer comparator (US-136). Imports no database and no model
 * module on purpose: that is what keeps the route at zero model calls and
 * zero rows written.
 */
@Module({
  imports: [LeadsModule],
  controllers: [PublicKeywordMatchController],
  providers: [KeywordMatchService],
})
export class KeywordMatchModule {}

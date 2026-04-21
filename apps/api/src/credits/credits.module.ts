import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { resolveCreditsConfig } from "./credits.config";
import { CreditsController } from "./credits.controller";
import { CreditsService } from "./credits.service";
import { FileCreditLedgerStore } from "./credits.store";

@Module({
  imports: [AuthModule],
  controllers: [CreditsController],
  providers: [
    {
      provide: CreditsService,
      useFactory: () => {
        const config = resolveCreditsConfig(process.env);

        return new CreditsService(
          new FileCreditLedgerStore(config.stateFilePath),
          config,
        );
      },
    },
  ],
  exports: [CreditsService],
})
export class CreditsModule {}

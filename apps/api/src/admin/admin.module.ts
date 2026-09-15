import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CreditsModule } from "../credits/credits.module";
import { PrivacyModule } from "../privacy/privacy.module";
import { AdminUsersController } from "./admin-users.controller";

@Module({
  imports: [AuthModule, CreditsModule, PrivacyModule],
  controllers: [AdminUsersController],
})
export class AdminModule {}

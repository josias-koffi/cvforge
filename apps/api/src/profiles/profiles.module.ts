import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";
import { PgProfilesStore } from "./profiles.pg-store";
import { PROFILES_STORE, type ProfilesStore } from "./profiles.types";

@Module({
  imports: [AuthModule],
  controllers: [ProfilesController],
  providers: [
    {
      provide: PROFILES_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgProfilesStore(db),
    },
    {
      provide: ProfilesService,
      inject: [PROFILES_STORE],
      useFactory: (store: ProfilesStore) => new ProfilesService(store),
    },
  ],
  exports: [PROFILES_STORE],
})
export class ProfilesModule {}

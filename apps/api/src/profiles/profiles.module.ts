import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { RomeModule } from "../rome/rome.module";
import { RomeoClient } from "../rome/romeo.client";
import { ProfileCompetencesController } from "./profile-competences.controller";
import {
  PgProfileCompetencesStore,
  PROFILE_COMPETENCES_STORE,
  type ProfileCompetencesStore,
} from "./profile-competences.pg-store";
import { ProfileCompetencesService } from "./profile-competences.service";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";
import { PgProfilesStore } from "./profiles.pg-store";
import { PROFILES_STORE, type ProfilesStore } from "./profiles.types";

@Module({
  imports: [AuthModule, RomeModule],
  controllers: [ProfilesController, ProfileCompetencesController],
  providers: [
    {
      provide: PROFILES_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgProfilesStore(db),
    },
    {
      provide: PROFILE_COMPETENCES_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgProfileCompetencesStore(db),
    },
    {
      provide: ProfileCompetencesService,
      inject: [PROFILE_COMPETENCES_STORE, RomeoClient],
      useFactory: (store: ProfileCompetencesStore, romeo: RomeoClient) =>
        new ProfileCompetencesService(store, romeo),
    },
    {
      provide: ProfilesService,
      inject: [PROFILES_STORE, ProfileCompetencesService],
      useFactory: (
        store: ProfilesStore,
        competences: ProfileCompetencesService,
      ) => new ProfilesService(store, competences),
    },
  ],
  exports: [PROFILES_STORE],
})
export class ProfilesModule {}

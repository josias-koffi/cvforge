import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { ProfilesModule } from "../profiles/profiles.module";
import { PROFILES_STORE, type ProfilesStore } from "../profiles/profiles.types";
import { SearchProjectsController } from "./search-projects.controller";
import { PgSearchProjectsStore } from "./search-projects.pg-store";
import { SearchProjectsService } from "./search-projects.service";
import {
  SEARCH_PROJECTS_STORE,
  type SearchProjectsStore,
} from "./search-projects.types";

@Module({
  imports: [AuthModule, ProfilesModule],
  controllers: [SearchProjectsController],
  providers: [
    {
      provide: SEARCH_PROJECTS_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgSearchProjectsStore(db),
    },
    {
      provide: SearchProjectsService,
      inject: [SEARCH_PROJECTS_STORE, PROFILES_STORE],
      useFactory: (store: SearchProjectsStore, profiles: ProfilesStore) =>
        new SearchProjectsService(store, profiles),
    },
  ],
  exports: [SEARCH_PROJECTS_STORE],
})
export class SearchProjectsModule {}

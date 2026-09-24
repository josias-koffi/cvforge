import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DATABASE, type Database } from "../database/database.types";
import { ProfilesModule } from "../profiles/profiles.module";
import { PROFILES_STORE, type ProfilesStore } from "../profiles/profiles.types";
import {
  ROME_APPELLATIONS,
  type RomeAppellationsReader,
} from "../rome/rome-appellations.pg-reader";
import { RomeModule } from "../rome/rome.module";
import { RomeoClient } from "../rome/romeo.client";
import {
  PgSearchProjectRomeStore,
  SEARCH_PROJECT_ROME_STORE,
  type SearchProjectRomeStore,
} from "./search-project-rome.pg-store";
import { SearchProjectRomeService } from "./search-project-rome.service";
import { SearchProjectsController } from "./search-projects.controller";
import { PgSearchProjectsStore } from "./search-projects.pg-store";
import { SearchProjectsService } from "./search-projects.service";
import {
  SEARCH_PROJECTS_STORE,
  type SearchProjectsStore,
} from "./search-projects.types";

@Module({
  imports: [AuthModule, ProfilesModule, RomeModule],
  controllers: [SearchProjectsController],
  providers: [
    {
      provide: SEARCH_PROJECTS_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgSearchProjectsStore(db),
    },
    {
      provide: SEARCH_PROJECT_ROME_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgSearchProjectRomeStore(db),
    },
    {
      provide: SearchProjectRomeService,
      inject: [SEARCH_PROJECT_ROME_STORE, RomeoClient, ROME_APPELLATIONS],
      useFactory: (
        store: SearchProjectRomeStore,
        romeo: RomeoClient,
        appellations: RomeAppellationsReader,
      ) => new SearchProjectRomeService(store, romeo, appellations),
    },
    {
      provide: SearchProjectsService,
      inject: [SEARCH_PROJECTS_STORE, PROFILES_STORE, SearchProjectRomeService],
      useFactory: (
        store: SearchProjectsStore,
        profiles: ProfilesStore,
        rome: SearchProjectRomeService,
      ) => new SearchProjectsService(store, profiles, rome),
    },
  ],
  exports: [SEARCH_PROJECTS_STORE, SEARCH_PROJECT_ROME_STORE],
})
export class SearchProjectsModule {}

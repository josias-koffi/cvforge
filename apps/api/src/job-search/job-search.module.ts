import { Inject, Module, type OnModuleInit } from "@nestjs/common";
import { OpenRouterModule, OPENROUTER_SERVICE } from "../ai/openrouter.module";
import type { OpenRouterService } from "../ai/openrouter.service";
import { ApplicationsModule } from "../applications/applications.module";
import { ApplicationsService } from "../applications/applications.service";
import { AuthModule } from "../auth/auth.module";
import { resolveAuthConfig } from "../auth/auth.config";
import { CreditsModule } from "../credits/credits.module";
import { CreditsService } from "../credits/credits.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { NotificationsService } from "../notifications/notifications.service";
import { ProfilesModule } from "../profiles/profiles.module";
import { PROFILES_STORE, type ProfilesStore } from "../profiles/profiles.types";
import { SearchProjectsModule } from "../search-projects/search-projects.module";
import {
  SEARCH_PROJECTS_STORE,
  type SearchProjectsStore,
} from "../search-projects/search-projects.types";
import { DATABASE, type Database } from "../database/database.types";
import { BoardsService } from "./boards.service";
import { JobDeduplicator } from "./dedup/job-deduplicator";
import { JobDigestService } from "./job-digest.service";
import { FranceTravailModule } from "../france-travail/france-travail.module";
import { FtHttpClient } from "../france-travail/ft-http.client";
import {
  buildJobSources,
  JOB_SOURCE_ADAPTERS,
} from "./sources/job-sources.factory";
import type { JobSourceAdapter } from "./job-search.types";
import {
  PgJobDigestRunsStore,
  PgJobMatchesStore,
} from "./matches.pg-store";
import {
  JOB_DIGEST_RUNS_STORE,
  JOB_MATCHES_STORE,
  type JobDigestRunsStore,
  type JobMatchesStore,
} from "./matches.types";
import { PgJobSourcesStore } from "./job-sources.pg-store";
import { JOB_SOURCES_STORE, type JobSourcesStore } from "./job-sources.types";
import { PgJobsStore } from "./jobs.pg-store";
import { JOBS_STORE, type JobsStore } from "./jobs.types";
import { PgJobBoardsStore } from "./boards.pg-store";
import { JOB_BOARDS_STORE, type JobBoardsStore } from "./boards.types";
import { JobBoardsController } from "./job-boards.controller";
import { JobSearchAdminController } from "./job-search-admin.controller";
import { JobMatchesController } from "./job-matches.controller";
import { JobMatchesService } from "./job-matches.service";
import {
  PgRomeMatchingReader,
  ROME_MATCHING_READER,
  type RomeMatchingReader,
} from "./rome-matching.pg-reader";

/**
 * The job search: where offers come from.
 *
 * It depends on applications — never the other way round. The registry grows
 * from imported offers by *subscribing* to them here, the same arrangement the
 * credits module uses on `AuthService.onAccountCreated`.
 */
@Module({
  imports: [
    ApplicationsModule,
    AuthModule,
    CreditsModule,
    FranceTravailModule,
    NotificationsModule,
    OpenRouterModule,
    ProfilesModule,
    SearchProjectsModule,
  ],
  controllers: [
    JobBoardsController,
    JobSearchAdminController,
    JobMatchesController,
  ],
  providers: [
    {
      provide: JOB_SOURCE_ADAPTERS,
      inject: [FtHttpClient],
      useFactory: (franceTravail: FtHttpClient) =>
        buildJobSources(process.env, franceTravail),
    },
    {
      provide: JOB_BOARDS_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgJobBoardsStore(db),
    },
    {
      provide: JOBS_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgJobsStore(db),
    },
    {
      provide: JobDeduplicator,
      inject: [JOBS_STORE],
      useFactory: (store: JobsStore) => new JobDeduplicator(store),
    },
    {
      provide: BoardsService,
      inject: [JOB_BOARDS_STORE],
      useFactory: (store: JobBoardsStore) => new BoardsService(store),
    },
    {
      provide: JOB_MATCHES_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgJobMatchesStore(db),
    },
    {
      provide: JOB_DIGEST_RUNS_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgJobDigestRunsStore(db),
    },
    {
      provide: JOB_SOURCES_STORE,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgJobSourcesStore(db),
    },
    {
      provide: JobMatchesService,
      inject: [
        JOB_MATCHES_STORE,
        JOBS_STORE,
        ApplicationsService,
        JOB_SOURCES_STORE,
        JOB_SOURCE_ADAPTERS,
      ],
      useFactory: (
        matches: JobMatchesStore,
        jobsStore: JobsStore,
        applications: ApplicationsService,
        sourceStates: JobSourcesStore,
        adapters: JobSourceAdapter[],
      ) =>
        new JobMatchesService(
          matches,
          jobsStore,
          applications,
          adapters,
          sourceStates,
        ),
    },
    {
      provide: ROME_MATCHING_READER,
      inject: [DATABASE],
      useFactory: (db: Database) => new PgRomeMatchingReader(db),
    },
    {
      provide: JobDigestService,
      inject: [
        SEARCH_PROJECTS_STORE,
        PROFILES_STORE,
        JOBS_STORE,
        JOB_MATCHES_STORE,
        JOB_DIGEST_RUNS_STORE,
        JOB_SOURCES_STORE,
        BoardsService,
        JobDeduplicator,
        CreditsService,
        OPENROUTER_SERVICE,
        NotificationsService,
        JOB_SOURCE_ADAPTERS,
        ROME_MATCHING_READER,
      ],
      useFactory: (
        searchProjects: SearchProjectsStore,
        profiles: ProfilesStore,
        jobsStore: JobsStore,
        matches: JobMatchesStore,
        runs: JobDigestRunsStore,
        sourceStates: JobSourcesStore,
        boards: BoardsService,
        deduplicator: JobDeduplicator,
        credits: CreditsService,
        openRouter: OpenRouterService,
        notifications: NotificationsService,
        adapters: JobSourceAdapter[],
        rome: RomeMatchingReader,
      ) =>
        new JobDigestService(
          searchProjects,
          profiles,
          jobsStore,
          matches,
          runs,
          sourceStates,
          boards,
          deduplicator,
          adapters,
          credits,
          openRouter,
          notifications,
          rome,
          // Same source as the magic links, so both point at the same app.
          resolveAuthConfig(process.env).appUrl,
        ),
    },
  ],
  exports: [
    BoardsService,
    JobDeduplicator,
    JobDigestService,
    JOB_BOARDS_STORE,
    JOB_MATCHES_STORE,
    JOB_SOURCES_STORE,
    JOBS_STORE,
  ],
})
export class JobSearchModule implements OnModuleInit {
  // Explicit tokens: this repo does not rely on decorator metadata for DI.
  constructor(
    @Inject(ApplicationsService)
    private readonly applications: ApplicationsService,
    @Inject(BoardsService) private readonly boards: BoardsService,
  ) {}

  onModuleInit() {
    this.applications.onOfferImported(async (offerUrl) => {
      await this.boards.registerFromUrl(offerUrl, "user");
    });
  }
}

import type { Provider } from "@nestjs/common";
import { DATABASE, type Database } from "../database/database.types";
import { FtHttpClient } from "../france-travail/ft-http.client";
import { BoardsService } from "./boards.service";
import { PgBoardCadenceStore } from "./board-cadence.pg-store";
import {
  BOARD_CADENCE_STORE,
  type BoardCadenceStore,
} from "./board-cadence.types";
import {
  BoardStreamService,
  resolveBoardStreamConfig,
} from "./board-stream.service";
import { JobDeduplicator } from "./dedup/job-deduplicator";
import type {
  JobSourceAdapter,
  NormalizedJobListing,
} from "./job-search.types";
import {
  ALERT_MATCHES_STORE,
  PgAlertMatchesStore,
  type AlertMatchesStore,
} from "./alert-matches.pg-store";
import { JOBS_STORE, type JobsStore } from "./jobs.types";
import { LiveMatcher } from "./live-matching";
import {
  JobAlertDispatcher,
  resolveJobAlertConfig,
} from "./job-alerts.service";
import {
  JobAlertEnricher,
  resolveJobAlertEnrichConfig,
} from "./job-alert-enrich.service";
import { OPENROUTER_SERVICE } from "../ai/openrouter.module";
import type { OpenRouterService } from "../ai/openrouter.service";
import { CreditsService } from "../credits/credits.service";
import { resolveAuthConfig } from "../auth/auth.config";
import { NotificationsService } from "../notifications/notifications.service";
import {
  ROME_MATCHING_READER,
  type RomeMatchingReader,
} from "./rome-matching.pg-reader";
import { JOB_SOURCE_ADAPTERS } from "./sources/job-sources.factory";
import { PROFILES_STORE, type ProfilesStore } from "../profiles/profiles.types";
import {
  SEARCH_PROJECTS_STORE,
  type SearchProjectsStore,
} from "../search-projects/search-projects.types";
import { JOB_SOURCES_STORE, type JobSourcesStore } from "./job-sources.types";
import {
  PgJobSourceCallsStore,
  PgJobStreamCursorsStore,
} from "./job-stream.pg-store";
import { JobStreamService, resolveJobStreamConfig } from "./job-stream.service";
import {
  JOB_SOURCE_CALLS_STORE,
  JOB_STREAM_CURSORS_STORE,
  type JobSourceCallsStore,
  type JobStreamCursorsStore,
} from "./job-stream.types";
import { SourceCallCounter } from "./source-call-counter";
import { FranceTravailStreamReader } from "./sources/france-travail.stream";

/** The continuous collection, its matching, its alerts and the call counter (ADR-027). */
export const jobStreamProviders: Provider[] = [
  {
    provide: JobAlertDispatcher,
    inject: [
      ALERT_MATCHES_STORE,
      NotificationsService,
      JOB_STREAM_CURSORS_STORE,
    ],
    useFactory: (
      alerts: AlertMatchesStore,
      notifications: NotificationsService,
      cursors: JobStreamCursorsStore,
    ) =>
      new JobAlertDispatcher(
        alerts,
        notifications,
        cursors,
        resolveJobAlertConfig(process.env),
        // Same base as the magic links and the morning e-mail.
        resolveAuthConfig(process.env).appUrl,
      ),
  },
  {
    provide: JobAlertEnricher,
    inject: [
      ALERT_MATCHES_STORE,
      NotificationsService,
      PROFILES_STORE,
      CreditsService,
      OPENROUTER_SERVICE,
      JOB_STREAM_CURSORS_STORE,
    ],
    useFactory: (
      alerts: AlertMatchesStore,
      notifications: NotificationsService,
      profiles: ProfilesStore,
      credits: CreditsService,
      openRouter: OpenRouterService,
      cursors: JobStreamCursorsStore,
    ) =>
      new JobAlertEnricher({
        alerts,
        config: resolveJobAlertEnrichConfig(process.env),
        credits,
        cursors,
        notifications,
        openRouter,
        profiles,
      }),
  },
  {
    provide: ALERT_MATCHES_STORE,
    inject: [DATABASE],
    useFactory: (db: Database) => new PgAlertMatchesStore(db),
  },
  {
    provide: LiveMatcher,
    inject: [
      SEARCH_PROJECTS_STORE,
      PROFILES_STORE,
      ROME_MATCHING_READER,
      JobDeduplicator,
      JOBS_STORE,
      ALERT_MATCHES_STORE,
      JOB_SOURCE_ADAPTERS,
      NotificationsService,
    ],
    useFactory: (
      searchProjects: SearchProjectsStore,
      profiles: ProfilesStore,
      rome: RomeMatchingReader,
      deduplicator: JobDeduplicator,
      jobs: JobsStore,
      alerts: AlertMatchesStore,
      sources: JobSourceAdapter[],
      notifications: NotificationsService,
    ) =>
      new LiveMatcher({
        alertPreferences: (userEmail) =>
          notifications.readJobAlertPreferences(userEmail),
        alerts,
        deduplicator,
        jobs,
        now: Date.now,
        profiles,
        rome,
        searchProjects,
        sources,
      }),
  },
  {
    provide: JOB_STREAM_CURSORS_STORE,
    inject: [DATABASE],
    useFactory: (db: Database) => new PgJobStreamCursorsStore(db),
  },
  {
    provide: JOB_SOURCE_CALLS_STORE,
    inject: [DATABASE],
    useFactory: (db: Database) => new PgJobSourceCallsStore(db),
  },
  {
    provide: SourceCallCounter,
    inject: [JOB_SOURCE_CALLS_STORE, FtHttpClient],
    useFactory: (store: JobSourceCallsStore, franceTravail: FtHttpClient) => {
      const counter = new SourceCallCounter(store);
      // Offres d'emploi only: the other France Travail APIs are no job source.
      franceTravail.onRequest((api) => {
        if (api === "offres") counter.add("france_travail");
      });

      return counter;
    },
  },
  {
    provide: JobStreamService,
    inject: [
      FtHttpClient,
      JOB_STREAM_CURSORS_STORE,
      JOB_SOURCES_STORE,
      LiveMatcher,
      BoardsService,
    ],
    useFactory: (
      franceTravail: FtHttpClient,
      cursors: JobStreamCursorsStore,
      sourceStates: JobSourcesStore,
      matcher: LiveMatcher,
      boards: BoardsService,
    ) =>
      new JobStreamService(
        new FranceTravailStreamReader(franceTravail),
        cursors,
        sourceStates,
        streamSink(matcher, boards),
        resolveJobStreamConfig(process.env),
      ),
  },
  {
    provide: BOARD_CADENCE_STORE,
    inject: [DATABASE],
    useFactory: (db: Database) => new PgBoardCadenceStore(db),
  },
  {
    provide: BoardStreamService,
    inject: [
      BoardsService,
      BOARD_CADENCE_STORE,
      JOB_STREAM_CURSORS_STORE,
      JOB_SOURCES_STORE,
      LiveMatcher,
    ],
    useFactory: (
      boards: BoardsService,
      cadence: BoardCadenceStore,
      cursors: JobStreamCursorsStore,
      sourceStates: JobSourcesStore,
      matcher: LiveMatcher,
    ) =>
      new BoardStreamService(
        boards,
        cadence,
        cursors,
        sourceStates,
        streamSink(matcher, boards),
        resolveBoardStreamConfig(process.env),
      ),
  },
];

/**
 * Where both continuous passes put what they read: the matcher keeps only the
 * offers a search wants (ADR-027 §4, US-165); every advert's original link
 * still grows the registry, as in the daily pass — a link is not an offer.
 */
function streamSink(matcher: LiveMatcher, boards: BoardsService) {
  return async (listings: NormalizedJobListing[]) => {
    await matcher.handle(listings);
    await boards.registerManyFromUrls(
      [...new Set(listings.flatMap((listing) => listing.partnerUrls))],
      "france_travail",
    );
  };
}

import {
  NOTIFICATION_TYPE_JOB_ALERT,
  type DraftApplication,
} from "@cvforge/types";
import { NotFoundException } from "@nestjs/common";
import { z } from "zod";
import type { ApplicationsService } from "../../../applications/applications.service";
import type { CreditsService } from "../../../credits/credits.service";
import type { CvGenerationService } from "../../../cv-generation/cv-generation.service";
import type {
  JobMatchesService,
  OfferSearchResult,
} from "../../../job-search/job-matches.service";
import {
  OFFER_SEARCH_PAGE_SIZE,
  jobContractFilters,
  readOfferSearchQuery,
} from "../../../job-search/offer-search-query";
import type { NotificationsService } from "../../../notifications/notifications.service";
import type { ProfilesService } from "../../../profiles/profiles.service";
import { defineTool } from "../mcp-tool";

export type ReadToolsDeps = {
  applications: Pick<
    ApplicationsService,
    "listApplications" | "getApplicationForUser" | "getOfferForUser"
  >;
  credits: Pick<
    CreditsService,
    "getBalanceSummaryForUser" | "getHistoryPageForUser"
  >;
  documents: Pick<CvGenerationService, "getCvContent" | "getLetterContent">;
  jobs: Pick<JobMatchesService, "searchOffers" | "getDigest" | "listRecent">;
  notifications: Pick<
    NotificationsService,
    "listNotifications" | "getSummary" | "markAsRead"
  >;
  profiles: Pick<ProfilesService, "getRegistry">;
};

const ALERTS_LIMIT = 30;
const OFFER_EXCERPT_CHARS = 600;

/**
 * An offer as an agent needs it to choose: about 1 KB instead of the 5 KB the
 * web page renders from (listings, score breakdown, every detail field).
 */
export function summarizeOffer(offer: OfferSearchResult) {
  const { job } = offer;
  const description = job.description.replace(/\s+/g, " ").trim();

  return {
    aiReason: offer.aiReason,
    applicationId: offer.applicationId,
    applyUrl: offer.details?.apply?.url ?? job.primaryUrl,
    company: job.companyAnonymous ? null : job.companyName,
    contractType: job.contractType,
    excerpt:
      description.length > OFFER_EXCERPT_CHARS
        ? `${description.slice(0, OFFER_EXCERPT_CHARS)}…`
        : description,
    jobId: job.id,
    location: job.locationLabel,
    publishedAt: job.publishedAt,
    remote: job.remote,
    salary: job.salaryLabel,
    score: offer.score,
    status: offer.status,
    title: job.title,
  };
}

function summarizeApplication(application: DraftApplication) {
  return {
    company: application.extracted.companyName,
    contractType: application.extracted.contractType,
    createdAt: application.createdAt,
    cvGeneratedAt: application.cvGeneratedAt,
    id: application.id,
    letterGeneratedAt: application.letterGeneratedAt ?? null,
    location: application.extracted.location,
    offerUrl: application.offerUrl,
    profileId: application.profileId ?? null,
    status: application.status,
    title: application.extracted.title,
  };
}

const applicationId = z
  .string()
  .min(1)
  .max(100)
  .describe("Identifiant de la candidature");

export function readTools(deps: ReadToolsDeps) {
  return [
    defineTool({
      description:
        "Vue d'ensemble du compte : solde de crédits, profil actif, nombre d'alertes non lues.",
      inputSchema: {},
      name: "get_account_overview",
      readOnly: true,
      async run(_args, { principal }) {
        const email = principal.userEmail;
        const [credits, notifications, registry] = await Promise.all([
          deps.credits.getBalanceSummaryForUser(email),
          deps.notifications.getSummary(email),
          deps.profiles.getRegistry(email),
        ]);
        const active = registry?.profiles.find(
          (p) => p.id === registry.activeProfileId,
        );

        return {
          activeProfile: active ? { id: active.id, label: active.label } : null,
          credits,
          notifications,
          profileCount: registry?.profiles.length ?? 0,
        };
      },
      scopes: ["credits:read"],
      title: "Vue d'ensemble du compte",
    }),
    defineTool({
      description: "Solde de crédits JobSpark de l'utilisateur.",
      inputSchema: {},
      name: "get_credit_balance",
      readOnly: true,
      run: (_args, { principal }) =>
        deps.credits.getBalanceSummaryForUser(principal.userEmail),
      scopes: ["credits:read"],
      title: "Solde de crédits",
    }),
    defineTool({
      description:
        "Historique des mouvements de crédits (achats, dépenses), paginé.",
      inputSchema: {
        kind: z
          .string()
          .max(30)
          .optional()
          .describe("Filtre de type, ex. « spend », « purchase »"),
        page: z.number().int().min(1).max(100).optional(),
      },
      name: "list_credit_history",
      readOnly: true,
      run: (args, { principal }) =>
        deps.credits.getHistoryPageForUser(principal.userEmail, {
          kind: args.kind,
          page: String(args.page ?? 1),
          pageSize: "20",
        }),
      scopes: ["credits:read"],
      title: "Historique de crédits",
    }),
    defineTool({
      description:
        "Profils de l'utilisateur (identité, titre, expériences, formations, compétences, langues…). " +
        "Les identifiants d'expérience servent à update_experience.",
      inputSchema: {
        profileId: z
          .string()
          .max(100)
          .optional()
          .describe("Un seul profil ; par défaut tous"),
      },
      name: "get_profile",
      readOnly: true,
      async run(args, { principal }) {
        const registry = await deps.profiles.getRegistry(principal.userEmail);
        const profiles = registry?.profiles ?? [];

        if (!args.profileId) {
          return {
            activeProfileId: registry?.activeProfileId ?? null,
            profiles,
          };
        }

        const profile = profiles.find((p) => p.id === args.profileId);

        if (!profile) {
          throw new NotFoundException("Profil introuvable.");
        }

        return profile;
      },
      scopes: ["profile:read"],
      title: "Lire le profil",
    }),
    defineTool({
      description: `Recherche dans les offres d'emploi de JobSpark (${OFFER_SEARCH_PAGE_SIZE} par page).`,
      inputSchema: {
        contracts: z.array(z.enum(jobContractFilters)).max(8).optional(),
        departments: z
          .array(z.string().max(3))
          .max(10)
          .optional()
          .describe('Ex. ["44", "75"]'),
        page: z.number().int().min(1).max(50).optional(),
        publishedWithinDays: z
          .union([z.literal(1), z.literal(3), z.literal(7)])
          .optional(),
        query: z.string().max(120).optional().describe("Métier, mots-clés"),
        radiusKm: z.number().int().optional().describe("10, 20, 30, 50 ou 100"),
        remoteOnly: z.boolean().optional(),
        sort: z.enum(["relevance", "recent"]).optional(),
        townCode: z
          .string()
          .max(5)
          .optional()
          .describe("Code INSEE de la commune"),
      },
      name: "search_offers",
      readOnly: true,
      untrusted: true,
      async run(args, { principal }) {
        const search = readOfferSearchQuery({
          contrat: args.contracts?.join(","),
          departement: args.departments?.join(","),
          page: args.page ? String(args.page) : undefined,
          publiee: args.publishedWithinDays
            ? String(args.publishedWithinDays)
            : undefined,
          q: args.query,
          rayon: args.radiusKm ? String(args.radiusKm) : undefined,
          teletravail: args.remoteOnly ? "1" : undefined,
          tri: args.sort,
          ville: args.townCode,
        });
        const found = await deps.jobs.searchOffers(
          principal.userEmail,
          search.filters,
        );

        return {
          ...found,
          offers: found.offers.map(summarizeOffer),
          page: search.page,
          place: search.place,
        };
      },
      scopes: ["jobs:read"],
      title: "Rechercher des offres",
    }),
    defineTool({
      description: "Sélection « Offres du jour » de l'utilisateur.",
      inputSchema: {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("AAAA-MM-JJ, par défaut aujourd'hui"),
      },
      name: "get_daily_offers",
      readOnly: true,
      untrusted: true,
      async run(args, { principal }) {
        const digest = await deps.jobs.getDigest(
          principal.userEmail,
          args.date ?? null,
        );

        return { ...digest, matches: digest.matches.map(summarizeOffer) };
      },
      scopes: ["jobs:read"],
      title: "Offres du jour",
    }),
    defineTool({
      description:
        "Dernières offres proposées à l'utilisateur (alertes et sélections).",
      inputSchema: { limit: z.number().int().min(1).max(100).optional() },
      name: "list_recent_offers",
      readOnly: true,
      untrusted: true,
      async run(args, { principal }) {
        const recent = await deps.jobs.listRecent(
          principal.userEmail,
          args.limit ?? 30,
        );

        return recent.map(summarizeOffer);
      },
      scopes: ["jobs:read"],
      title: "Offres récentes",
    }),
    defineTool({
      description: `Dernières alertes d'offres (${ALERTS_LIMIT} au plus), les plus récentes d'abord.`,
      inputSchema: { unreadOnly: z.boolean().optional() },
      name: "list_job_alerts",
      readOnly: true,
      untrusted: true,
      async run(args, { principal }) {
        const all = await deps.notifications.listNotifications(
          principal.userEmail,
        );

        return all
          .filter((n) => n.type === NOTIFICATION_TYPE_JOB_ALERT)
          .filter((n) => !args.unreadOnly || !n.readAt)
          .slice(0, ALERTS_LIMIT);
      },
      scopes: ["notifications:read"],
      title: "Alertes d'offres",
    }),
    defineTool({
      description: "Marque une alerte (notification) comme lue.",
      inputSchema: { notificationId: z.string().min(1).max(100) },
      name: "mark_alert_read",
      run: (args, { principal }) =>
        deps.notifications.markAsRead(principal.userEmail, args.notificationId),
      scopes: ["notifications:read"],
      title: "Marquer une alerte comme lue",
    }),
    defineTool({
      description:
        "Candidatures de l'utilisateur, résumées (poste, entreprise, statut, documents).",
      inputSchema: {},
      name: "list_applications",
      readOnly: true,
      untrusted: true,
      async run(_args, { principal }) {
        const applications = await deps.applications.listApplications(
          principal.userEmail,
        );

        return applications.map(summarizeApplication);
      },
      scopes: ["applications:read"],
      title: "Lister les candidatures",
    }),
    defineTool({
      description:
        "Détail d'une candidature et de l'offre analysée (missions, exigences, mots-clés).",
      inputSchema: { applicationId },
      name: "get_application",
      readOnly: true,
      untrusted: true,
      async run(args, { principal }) {
        const email = principal.userEmail;
        const [application, offer] = await Promise.all([
          deps.applications.getApplicationForUser(email, args.applicationId),
          deps.applications.getOfferForUser(email, args.applicationId),
        ]);

        return { application: summarizeApplication(application), offer };
      },
      scopes: ["applications:read"],
      title: "Détail d'une candidature",
    }),
    defineTool({
      description: "Contenu du CV généré pour une candidature.",
      inputSchema: { applicationId },
      name: "get_cv",
      readOnly: true,
      run: (args, { principal }) =>
        deps.documents.getCvContent(principal.userEmail, args.applicationId),
      scopes: ["applications:read"],
      title: "Lire le CV",
    }),
    defineTool({
      description:
        "Contenu de la lettre de motivation générée pour une candidature.",
      inputSchema: { applicationId },
      name: "get_cover_letter",
      readOnly: true,
      run: (args, { principal }) =>
        deps.documents.getLetterContent(
          principal.userEmail,
          args.applicationId,
        ),
      scopes: ["applications:read"],
      title: "Lire la lettre",
    }),
  ];
}

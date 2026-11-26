import {
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_LETTER_GENERATION,
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  AI_CREDIT_COSTS,
  applicationStatuses,
  buildGenerationRequest,
} from "@cvforge/types";
import {
  GoneException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { z } from "zod";
import type { ApplicationsService } from "../../../applications/applications.service";
import type { CreditsService } from "../../../credits/credits.service";
import type { CvGenerationService } from "../../../cv-generation/cv-generation.service";
import type { JobMatchesService } from "../../../job-search/job-matches.service";
import type { ProfilesService } from "../../../profiles/profiles.service";
import { defineTool } from "../mcp-tool";
import type { SignedFiles } from "../signed-files";

export type ApplicationToolsDeps = {
  applications: Pick<
    ApplicationsService,
    | "getApplicationForUser"
    | "importFromUrl"
    | "importFromPage"
    | "importFromText"
    | "updateStatus"
  >;
  credits: Pick<CreditsService, "getBalanceSummaryForUser">;
  documents: Pick<CvGenerationService, "generateCv" | "generateLetter">;
  jobs: Pick<JobMatchesService, "applyToJob">;
  profiles: Pick<ProfilesService, "getRegistry">;
  signedFiles: Pick<SignedFiles, "issue">;
};

const OFFER_COST = AI_CREDIT_COSTS[AI_CREDIT_ACTION_OFFER_ENRICHMENT];
const CV_COST = AI_CREDIT_COSTS[AI_CREDIT_ACTION_CV_GENERATION];
const LETTER_COST = AI_CREDIT_COSTS[AI_CREDIT_ACTION_LETTER_GENERATION];

const applicationId = z
  .string()
  .min(1)
  .max(100)
  .describe("Identifiant de la candidature");
const profileId = z
  .string()
  .max(100)
  .optional()
  .describe(
    "Profil à utiliser ; par défaut celui de la candidature, sinon le profil actif",
  );

export function applicationTools(deps: ApplicationToolsDeps) {
  const spent = async (email: string, creditsSpent: number) => ({
    balanceAfter: (await deps.credits.getBalanceSummaryForUser(email)).balance,
    creditsSpent,
  });

  /** The profile, pseudonymised exactly as the web app does it. */
  async function generationRequest(
    email: string,
    appId: string,
    requested?: string,
  ) {
    const [application, registry] = await Promise.all([
      deps.applications.getApplicationForUser(email, appId),
      deps.profiles.getRegistry(email),
    ]);
    const id = requested ?? application.profileId ?? registry?.activeProfileId;
    const profile = registry?.profiles.find((p) => p.id === id);

    if (!profile) {
      throw new NotFoundException(
        "Profil introuvable : complétez d'abord le profil.",
      );
    }

    return { ...buildGenerationRequest(profile), profileId: profile.id };
  }

  return [
    defineTool({
      cost: () => OFFER_COST,
      description:
        `Crée une candidature à partir d'une offre JobSpark (jobId de search_offers / offres du jour). ` +
        `Coûte ${OFFER_COST} crédit (analyse de l'offre), rien si déjà candidaté.`,
      inputSchema: { jobId: z.string().min(1).max(200) },
      name: "apply_to_offer",
      async run(args, { principal }) {
        const email = principal.userEmail;
        const result = await deps.jobs.applyToJob(email, args.jobId);

        if (result.outcome === "not_found")
          throw new NotFoundException("Offre introuvable.");
        if (result.outcome === "closed")
          throw new GoneException("Cette offre n'est plus disponible.");

        return {
          applicationId: result.applicationId,
          existing: result.existing ?? false,
          ...(await spent(email, result.existing ? 0 : OFFER_COST)),
        };
      },
      scopes: ["applications:write", "documents:generate"],
      title: "Postuler à une offre JobSpark",
    }),
    defineTool({
      cost: () => OFFER_COST,
      description:
        `Crée une candidature à partir de l'URL d'une offre (site carrière, job board) ou de son texte. ` +
        `Avec les deux, le texte lu sur la page est analysé et l'adresse gardée. ` +
        `Coûte ${OFFER_COST} crédit.`,
      inputSchema: {
        offerText: z
          .string()
          .min(50)
          .max(30_000)
          .optional()
          .describe(
            "Texte de l'offre : seul, ou avec `url` quand il a été lu sur la page",
          ),
        url: z.string().url().max(2000).optional(),
      },
      name: "import_offer",
      async run(args, { principal }) {
        const email = principal.userEmail;

        if (!args.url && !args.offerText) {
          throw new UnprocessableEntityException(
            "Donnez l'URL de l'offre, son texte, ou les deux.",
          );
        }

        const application =
          args.url && args.offerText
            ? await deps.applications.importFromPage(
                email,
                args.url,
                args.offerText,
              )
            : args.url
              ? await deps.applications.importFromUrl(email, args.url)
              : await deps.applications.importFromText(
                  email,
                  args.offerText ?? "",
                );

        return {
          applicationId: application.id,
          company: application.extracted.companyName,
          title: application.extracted.title,
          ...(await spent(email, OFFER_COST)),
        };
      },
      scopes: ["applications:write", "documents:generate"],
      title: "Importer une offre",
      untrusted: true,
    }),
    defineTool({
      description:
        "Change le statut d'une candidature (ex. « sent » une fois envoyée).",
      inputSchema: { applicationId, status: z.enum(applicationStatuses) },
      name: "update_application_status",
      async run(args, { principal }) {
        const updated = await deps.applications.updateStatus(
          principal.userEmail,
          args.applicationId,
          args.status,
        );

        return { applicationId: updated.id, status: updated.status };
      },
      scopes: ["applications:write"],
      title: "Changer le statut d'une candidature",
    }),
    defineTool({
      cost: () => CV_COST,
      description: `Génère le CV adapté à l'offre de la candidature. Coûte ${CV_COST} crédits.`,
      inputSchema: { applicationId, profileId },
      name: "generate_cv",
      async run(args, { principal }) {
        const email = principal.userEmail;
        const request = await generationRequest(
          email,
          args.applicationId,
          args.profileId,
        );
        const cv = await deps.documents.generateCv(
          email,
          args.applicationId,
          request,
        );

        return { cv, ...(await spent(email, CV_COST)) };
      },
      scopes: ["documents:generate"],
      title: "Générer le CV",
    }),
    defineTool({
      cost: () => LETTER_COST,
      description:
        `Génère la lettre de motivation de la candidature. Coûte ${LETTER_COST} crédits. ` +
        "`refinement` : consigne libre (ton, point à mettre en avant).",
      inputSchema: {
        applicationId,
        profileId,
        refinement: z.string().max(1000).optional(),
      },
      name: "generate_cover_letter",
      async run(args, { principal }) {
        const email = principal.userEmail;
        const request = await generationRequest(
          email,
          args.applicationId,
          args.profileId,
        );
        const letter = await deps.documents.generateLetter(
          email,
          args.applicationId,
          {
            ...request,
            refinement: args.refinement,
          },
        );

        return { letter, ...(await spent(email, LETTER_COST)) };
      },
      scopes: ["documents:generate"],
      title: "Générer la lettre de motivation",
    }),
    defineTool({
      description:
        "Lien de téléchargement du CV ou de la lettre (PDF ou DOCX), valable 10 minutes et une seule " +
        "fois. Télécharge-le (ex. curl -o cv.pdf <url>) puis joins le fichier sur le site du recruteur.",
      inputSchema: {
        applicationId,
        format: z.enum(["pdf", "docx"]).optional(),
        kind: z.enum(["cv", "letter"]),
      },
      name: "get_document_download_url",
      readOnly: true,
      async run(args, { principal }) {
        // Checks the application is the user's before signing anything.
        await deps.applications.getApplicationForUser(
          principal.userEmail,
          args.applicationId,
        );

        return deps.signedFiles.issue({
          applicationId: args.applicationId,
          format: args.format ?? "pdf",
          kind: args.kind,
          userEmail: principal.userEmail,
        });
      },
      scopes: ["applications:read"],
      title: "Télécharger le CV ou la lettre",
    }),
  ];
}

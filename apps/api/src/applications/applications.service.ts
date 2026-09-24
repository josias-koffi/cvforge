import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  APPLICATION_SOURCE_TEXT,
  APPLICATION_SOURCE_URL,
  APPLICATION_STATUS_DRAFT,
  applicationStatuses,
  applicationStatusTransitions,
  type ApplicationStatus,
  type ApplicationsKpiSummary,
  type DraftApplication,
  type InterviewReport,
} from "@cvforge/types";
import { randomUUID } from "node:crypto";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { CreditsService } from "../credits/credits.service";
import {
  LEAD_OFFER_SOURCE_LABEL,
  type ApplicationsStore,
  type OfferExtractionResult,
  type OfferUpdateInput,
  type StoredApplication,
} from "./applications.types";
import { summarizeApplications } from "./applications.kpi";
import { stripRawOfferText } from "./applications.normalize";
import { buildOfferPreview } from "./offer-extraction";
import { OfferImporter } from "./offer-import";
import {
  describeSource,
  mergeExtractedFields,
  normalizeEditedOfferText,
  normalizeOfferUrl,
} from "./offer-input";

function isApplicationStatus(value: string): value is ApplicationStatus {
  return applicationStatuses.includes(value as ApplicationStatus);
}

/** Notified with the URL of an offer a candidate just imported. */
export type OfferImportedListener = (offerUrl: string) => Promise<void>;

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  private readonly offers: OfferImporter;

  constructor(
    private readonly store: ApplicationsStore,
    openRouterService: OpenRouterService,
    creditsService: CreditsService,
    private readonly listProfileIds:
      | ((userEmail: string) => Promise<string[]>)
      | null = null,
  ) {
    this.offers = new OfferImporter(openRouterService, creditsService);
  }

  private readonly offerImportedListeners: OfferImportedListener[] = [];

  /**
   * Lets a module that depends on applications react to an imported offer
   * without applications depending on it back — the same arrangement as
   * `AuthService.onAccountCreated`.
   *
   * The job search uses it to register the company behind the offer URL when
   * it sits on a public job board (US-110). A listener that throws is logged
   * and ignored: growing a registry must never make an import fail.
   */
  onOfferImported(listener: OfferImportedListener) {
    this.offerImportedListeners.push(listener);
  }

  private async notifyOfferImported(offerUrl: string) {
    for (const listener of this.offerImportedListeners) {
      try {
        await listener(offerUrl);
      } catch (error) {
        this.logger.warn(
          `Offer-imported listener failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  async listApplications(userEmail: string): Promise<DraftApplication[]> {
    const applications = await this.store.listByUserEmail(userEmail);

    return applications.map(stripRawOfferText);
  }

  async listApplicationSummary(
    userEmail: string,
  ): Promise<ApplicationsKpiSummary> {
    const applications = await this.store.listByUserEmail(userEmail);

    return summarizeApplications(applications);
  }

  async getApplicationForUser(
    userEmail: string,
    applicationId: string,
  ): Promise<DraftApplication> {
    const application = await this.store.findByIdForUserEmail(
      userEmail,
      applicationId,
    );

    if (!application) {
      throw new NotFoundException("La candidature est introuvable.");
    }

    return stripRawOfferText(application);
  }

  async getOwnedApplication(
    userEmail: string,
    applicationId: string,
  ): Promise<StoredApplication> {
    const application = await this.store.findByIdForUserEmail(
      userEmail,
      applicationId,
    );

    if (!application) {
      throw new NotFoundException("La candidature est introuvable.");
    }

    return application;
  }

  async appendInterviewReport(
    userEmail: string,
    applicationId: string,
    report: InterviewReport,
  ): Promise<DraftApplication> {
    const application = await this.getOwnedApplication(
      userEmail,
      applicationId,
    );
    const timestamp = report.createdAt;
    const updatedApplication: StoredApplication = {
      ...application,
      interviewReports: [...(application.interviewReports ?? []), report],
      updatedAt: timestamp,
    };

    return stripRawOfferText(await this.store.save(updatedApplication));
  }

  async updateStatus(
    userEmail: string,
    applicationId: string,
    nextStatusValue: string,
  ): Promise<DraftApplication> {
    if (!isApplicationStatus(nextStatusValue)) {
      throw new BadRequestException("Le statut cible est invalide.");
    }

    const application = await this.getOwnedApplication(
      userEmail,
      applicationId,
    );

    if (application.status === nextStatusValue) {
      throw new BadRequestException("La candidature possede deja ce statut.");
    }

    const allowedNextStatuses = applicationStatusTransitions[
      application.status
    ] as readonly ApplicationStatus[];

    if (!allowedNextStatuses.includes(nextStatusValue)) {
      throw new ConflictException(
        "Cette transition de statut n'est pas autorisee.",
      );
    }

    const timestamp = new Date().toISOString();
    const updatedApplication: StoredApplication = {
      ...application,
      status: nextStatusValue,
      statusHistory: [
        ...application.statusHistory,
        {
          changedAt: timestamp,
          status: nextStatusValue,
        },
      ],
      updatedAt: timestamp,
    };

    return stripRawOfferText(await this.store.save(updatedApplication));
  }

  async importFromUrl(
    userEmail: string,
    rawUrl: string,
  ): Promise<DraftApplication> {
    const extraction = await this.offers.fromUrl(userEmail, rawUrl);

    return this.createDraftFromExtraction(userEmail, extraction);
  }

  async importFromText(
    userEmail: string,
    rawOfferText: string,
  ): Promise<DraftApplication> {
    const extraction = await this.offers.fromText(userEmail, rawOfferText);

    return this.createDraftFromExtraction(userEmail, extraction);
  }

  /**
   * The application a free tool's visitor asked for by signing up (US-136,
   * US-141), on the house. `sourceLabel` names the tool, which is what
   * `/admin/metrics` counts its activated accounts by.
   */
  async importOfferedText(
    userEmail: string,
    rawOfferText: string,
    sourceLabel = LEAD_OFFER_SOURCE_LABEL,
  ): Promise<DraftApplication> {
    return this.createDraftFromExtraction(
      userEmail,
      await this.offers.offered(rawOfferText, sourceLabel),
    );
  }

  /** Remembers the base profile used for this application (null resets to the default one). */
  async setProfile(
    userEmail: string,
    applicationId: string,
    profileIdValue: unknown,
  ): Promise<DraftApplication> {
    const profileId =
      profileIdValue === null
        ? null
        : typeof profileIdValue === "string" && profileIdValue.trim()
          ? profileIdValue.trim()
          : undefined;

    if (profileId === undefined) {
      throw new BadRequestException("Un identifiant de profil est requis.");
    }

    const application = await this.getOwnedApplication(
      userEmail,
      applicationId,
    );

    if (
      profileId &&
      this.listProfileIds &&
      !(await this.listProfileIds(userEmail)).includes(profileId)
    ) {
      throw new NotFoundException("Le profil est introuvable.");
    }

    return stripRawOfferText(
      await this.store.save({ ...application, profileId }),
    );
  }

  async getOfferForUser(userEmail: string, applicationId: string) {
    const application = await this.getOwnedApplication(
      userEmail,
      applicationId,
    );

    return {
      application: stripRawOfferText(application),
      offerText: application.rawOfferText,
    };
  }

  async updateOffer(
    userEmail: string,
    applicationId: string,
    patch: OfferUpdateInput,
  ): Promise<DraftApplication> {
    const application = await this.getOwnedApplication(
      userEmail,
      applicationId,
    );
    const offerUrl =
      patch.offerUrl === undefined
        ? application.offerUrl
        : patch.offerUrl === null || !patch.offerUrl.trim()
          ? null
          : normalizeOfferUrl(patch.offerUrl);
    const offerText =
      patch.offerText === undefined
        ? application.rawOfferText
        : normalizeEditedOfferText(patch.offerText);
    const extracted = patch.extracted
      ? mergeExtractedFields(application.extracted, patch.extracted)
      : application.extracted;

    return stripRawOfferText(
      await this.store.save({
        ...application,
        ...describeSource(offerUrl),
        extracted,
        offerTextPreview: buildOfferPreview(offerText),
        rawOfferText: offerText,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  async reExtractOffer(
    userEmail: string,
    applicationId: string,
    source: string,
  ): Promise<DraftApplication> {
    const application = await this.getOwnedApplication(
      userEmail,
      applicationId,
    );
    let extraction: OfferExtractionResult;

    if (source === APPLICATION_SOURCE_URL) {
      if (!application.offerUrl) {
        throw new BadRequestException(
          "Cette offre n'a pas de lien source a analyser.",
        );
      }

      extraction = await this.offers.fromUrl(userEmail, application.offerUrl);
    } else if (source === APPLICATION_SOURCE_TEXT) {
      extraction = {
        ...(await this.offers.fromText(userEmail, application.rawOfferText)),
        ...describeSource(application.offerUrl),
        offerUrl: application.offerUrl,
      };
    } else {
      throw new BadRequestException("La source d'extraction est invalide.");
    }

    return stripRawOfferText(
      await this.store.save({
        ...application,
        extracted: extraction.extracted,
        offerTextPreview: extraction.offerTextPreview,
        offerUrl: extraction.offerUrl,
        rawOfferText: extraction.offerText,
        sourceLabel: extraction.sourceLabel,
        sourceType: extraction.sourceType,
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  private async createDraftFromExtraction(
    userEmail: string,
    extraction: OfferExtractionResult,
  ): Promise<DraftApplication> {
    const timestamp = new Date().toISOString();
    const storedApplication: StoredApplication = {
      createdAt: timestamp,
      cvContent: null,
      cvGeneratedAt: null,
      id: randomUUID(),
      letterContent: null,
      letterGeneratedAt: null,
      offerTextPreview: extraction.offerTextPreview,
      offerUrl: extraction.offerUrl,
      rawOfferText: extraction.offerText,
      sourceLabel: extraction.sourceLabel,
      sourceType: extraction.sourceType,
      status: APPLICATION_STATUS_DRAFT,
      statusHistory: [
        {
          changedAt: timestamp,
          status: APPLICATION_STATUS_DRAFT,
        },
      ],
      updatedAt: timestamp,
      userEmail,
      extracted: extraction.extracted,
    };

    const draft = stripRawOfferText(
      await this.store.createDraft(storedApplication),
    );

    if (extraction.offerUrl) {
      await this.notifyOfferImported(extraction.offerUrl);
    }

    return draft;
  }
}

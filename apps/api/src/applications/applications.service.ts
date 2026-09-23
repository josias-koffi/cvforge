import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  AI_CREDIT_ACTION_OFFER_ENRICHMENT,
  APPLICATION_STATUS_INTERVIEW_SCHEDULED,
  APPLICATION_SOURCE_TEXT,
  APPLICATION_SOURCE_URL,
  APPLICATION_STATUS_DRAFT,
  APPLICATION_STATUS_OFFER_RECEIVED,
  APPLICATION_STATUS_REJECTED,
  applicationStatuses,
  applicationStatusTransitions,
  type ApplicationStatus,
  type ApplicationsKpiSummary,
  type DraftApplication,
  type ExtractedOfferFields,
  type InterviewReport,
} from "@cvforge/types";
import { randomUUID } from "node:crypto";
import { withOpenRouterHttpErrors } from "../ai/openrouter.exception";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { CreditsService } from "../credits/credits.service";
import type {
  ApplicationsStore,
  OfferExtractionResult,
  OfferUpdateInput,
  StoredApplication,
} from "./applications.types";
import {
  buildOfferPreview,
  extractOfferMetadata,
  extractVisibleTextFromHtml,
  inferLocaleFromText,
} from "./offer-extraction";

type NullableOfferField =
  | "companyName"
  | "contractType"
  | "location"
  | "salaryRange";

type ExtractedOfferPayload = Omit<ExtractedOfferFields, "language"> & {
  language?: string | null;
};

const MIN_OFFER_TEXT_LENGTH = 160;
const MAX_OFFER_TEXT_LENGTH = 50_000;
const MAX_EXTRACTED_LIST_ITEMS = 8;
const MAX_EDITED_LIST_ITEMS = 30;
const MANUAL_TEXT_SOURCE_LABEL = "Texte colle manuellement";
const RESPONSE_STATUSES = new Set<ApplicationStatus>([
  APPLICATION_STATUS_INTERVIEW_SCHEDULED,
  APPLICATION_STATUS_REJECTED,
  APPLICATION_STATUS_OFFER_RECEIVED,
]);

function normalizeOfferUrl(rawUrl: string) {
  const value = rawUrl.trim();

  if (!value) {
    throw new BadRequestException("Une URL d'offre est requise.");
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException("L'URL de l'offre est invalide.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new BadRequestException("Seules les URL http et https sont acceptees.");
  }

  return url.toString();
}

function normalizeOfferText(rawText: string) {
  const value = rawText.trim();

  if (!value) {
    throw new BadRequestException("Le texte de l'offre est requis.");
  }

  if (value.length < MIN_OFFER_TEXT_LENGTH) {
    throw new UnprocessableEntityException(
      "Le texte fourni est insuffisant pour creer une candidature.",
    );
  }

  return value;
}

function normalizeEditedOfferText(rawText: string) {
  const value = rawText.trim();

  if (!value) {
    throw new BadRequestException("Le descriptif de l'offre est requis.");
  }

  if (value.length > MAX_OFFER_TEXT_LENGTH) {
    throw new BadRequestException("Le descriptif de l'offre est trop long.");
  }

  return value;
}

function describeSource(offerUrl: string | null) {
  return offerUrl
    ? { offerUrl, sourceLabel: offerUrl, sourceType: APPLICATION_SOURCE_URL }
    : {
        offerUrl: null,
        sourceLabel: MANUAL_TEXT_SOURCE_LABEL,
        sourceType: APPLICATION_SOURCE_TEXT,
      };
}

function mergeExtractedFields(
  current: ExtractedOfferFields,
  patch: Partial<ExtractedOfferFields>,
): ExtractedOfferFields {
  const title =
    patch.title === undefined ? current.title : toStringOrNull(patch.title);

  if (!title) {
    throw new BadRequestException("L'intitule du poste est requis.");
  }

  const pickNullable = (key: NullableOfferField) =>
    patch[key] === undefined ? current[key] : toStringOrNull(patch[key]);
  const pickList = (key: "requirements" | "responsibilities") =>
    patch[key] === undefined
      ? current[key]
      : toStringArray(patch[key], MAX_EDITED_LIST_ITEMS);

  return {
    companyName: pickNullable("companyName"),
    contractType: pickNullable("contractType"),
    language:
      patch.language === "en" || patch.language === "fr"
        ? patch.language
        : current.language,
    location: pickNullable("location"),
    requirements: pickList("requirements"),
    responsibilities: pickList("responsibilities"),
    salaryRange: pickNullable("salaryRange"),
    summary:
      patch.summary === undefined
        ? current.summary
        : (toStringOrNull(patch.summary) ?? ""),
    title,
  };
}

function isApplicationStatus(value: string): value is ApplicationStatus {
  return applicationStatuses.includes(value as ApplicationStatus);
}

function createEmptyStatusCounts(): ApplicationsKpiSummary["statusCounts"] {
  return {
    draft: 0,
    interview_scheduled: 0,
    offer_received: 0,
    rejected: 0,
    sent: 0,
  };
}

function extractFirstJsonObject(rawContent: string) {
  const fencedMatch = rawContent.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? rawContent;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new UnprocessableEntityException(
      "Le service d'extraction n'a pas retourne un JSON exploitable.",
    );
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as ExtractedOfferPayload;
  } catch {
    throw new UnprocessableEntityException(
      "Le service d'extraction a retourne un JSON invalide.",
    );
  }
}

function toStringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function toStringArray(value: unknown, limit = MAX_EXTRACTED_LIST_ITEMS) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0)
    .slice(0, limit);
}

function normalizeExtractedFields(
  payload: ExtractedOfferPayload,
  fallback: {
    description: string | null;
    offerText: string;
    siteName: string | null;
    title: string | null;
  },
): ExtractedOfferFields {
  const title = toStringOrNull(payload.title) ?? fallback.title;
  const summary =
    toStringOrNull(payload.summary) ??
    fallback.description ??
    buildOfferPreview(fallback.offerText, 320);

  if (!title || !summary) {
    throw new UnprocessableEntityException(
      "L'offre a ete recuperee mais ses informations utiles n'ont pas pu etre extraites.",
    );
  }

  return {
    companyName: toStringOrNull(payload.companyName) ?? fallback.siteName,
    contractType: toStringOrNull(payload.contractType),
    language:
      payload.language === "en" || payload.language === "fr"
        ? payload.language
        : inferLocaleFromText(fallback.offerText),
    location: toStringOrNull(payload.location),
    requirements: toStringArray(payload.requirements),
    responsibilities: toStringArray(payload.responsibilities),
    salaryRange: toStringOrNull(payload.salaryRange),
    summary,
    title,
  };
}

/** Notified with the URL of an offer a candidate just imported. */
export type OfferImportedListener = (offerUrl: string) => Promise<void>;

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly store: ApplicationsStore,
    private readonly openRouterService: OpenRouterService,
    private readonly creditsService: CreditsService,
    private readonly listProfileIds:
      | ((userEmail: string) => Promise<string[]>)
      | null = null,
  ) {}

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
    const statusCounts = createEmptyStatusCounts();

    applications.forEach((application) => {
      statusCounts[application.status] += 1;
    });

    const totalCount = applications.length;
    const actionableCount = applications.filter(
      (application) => application.status !== APPLICATION_STATUS_DRAFT,
    ).length;
    const respondedCount = applications.filter((application) =>
      RESPONSE_STATUSES.has(application.status),
    ).length;

    return {
      respondedCount,
      responseRate:
        actionableCount === 0
          ? 0
          : Math.round((respondedCount / actionableCount) * 100),
      statusCounts,
      totalCount,
    };
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
    const application = await this.getOwnedApplication(userEmail, applicationId);
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

    const application = await this.getOwnedApplication(userEmail, applicationId);

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
    const extraction = await this.extractOffer(userEmail, rawUrl);

    return this.createDraftFromExtraction(userEmail, extraction);
  }

  async importFromText(
    userEmail: string,
    rawOfferText: string,
  ): Promise<DraftApplication> {
    const extraction = await this.extractOfferFromText(userEmail, rawOfferText);

    return this.createDraftFromExtraction(userEmail, extraction);
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

    const application = await this.getOwnedApplication(userEmail, applicationId);

    if (
      profileId &&
      this.listProfileIds &&
      !(await this.listProfileIds(userEmail)).includes(profileId)
    ) {
      throw new NotFoundException("Le profil est introuvable.");
    }

    return stripRawOfferText(await this.store.save({ ...application, profileId }));
  }

  async getOfferForUser(userEmail: string, applicationId: string) {
    const application = await this.getOwnedApplication(userEmail, applicationId);

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
    const application = await this.getOwnedApplication(userEmail, applicationId);
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
    const application = await this.getOwnedApplication(userEmail, applicationId);
    let extraction: OfferExtractionResult;

    if (source === APPLICATION_SOURCE_URL) {
      if (!application.offerUrl) {
        throw new BadRequestException(
          "Cette offre n'a pas de lien source a analyser.",
        );
      }

      extraction = await this.extractOffer(userEmail, application.offerUrl);
    } else if (source === APPLICATION_SOURCE_TEXT) {
      extraction = {
        ...(await this.extractOfferFromText(userEmail, application.rawOfferText)),
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

  private async extractOffer(
    userEmail: string,
    rawUrl: string,
  ): Promise<OfferExtractionResult> {
    const offerUrl = normalizeOfferUrl(rawUrl);
    const html = await this.fetchOfferHtml(offerUrl);
    const offerText = extractVisibleTextFromHtml(html);

    if (offerText.length < MIN_OFFER_TEXT_LENGTH) {
      throw new UnprocessableEntityException(
        "Le scraping a reussi mais le contenu recupere est insuffisant pour creer une candidature.",
      );
    }

    const metadata = extractOfferMetadata(html);
    const extracted = await this.extractWithCredits(userEmail, () =>
      this.extractStructuredFields(
        offerText,
        metadata,
        offerUrl,
        APPLICATION_SOURCE_URL,
      ),
    );

    return {
      extracted,
      offerText,
      offerTextPreview: buildOfferPreview(offerText),
      offerUrl,
      sourceLabel: offerUrl,
      sourceType: APPLICATION_SOURCE_URL,
    };
  }

  private async extractOfferFromText(
    userEmail: string,
    rawOfferText: string,
  ): Promise<OfferExtractionResult> {
    const offerText = normalizeOfferText(rawOfferText);
    const extracted = await this.extractWithCredits(userEmail, () =>
      this.extractStructuredFields(
        offerText,
        {
          description: buildOfferPreview(offerText, 320),
          siteName: null,
          title: null,
        },
        null,
        APPLICATION_SOURCE_TEXT,
      ),
    );

    return {
      extracted,
      offerText,
      offerTextPreview: buildOfferPreview(offerText),
      offerUrl: null,
      sourceLabel: MANUAL_TEXT_SOURCE_LABEL,
      sourceType: APPLICATION_SOURCE_TEXT,
    };
  }

  private async fetchOfferHtml(offerUrl: string) {
    let response: Response;

    try {
      response = await fetch(offerUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (compatible; CVforgeBot/1.0; +https://cvforge.app)",
        },
      });
    } catch {
      throw new BadGatewayException(
        "Impossible de recuperer cette offre depuis l'URL fournie.",
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        "Le site cible a refuse ou interrompu la recuperation de l'offre.",
      );
    }

    const html = await response.text();

    if (!html.trim()) {
      throw new UnprocessableEntityException(
        "L'URL a repondu mais n'a fourni aucun contenu exploitable.",
      );
    }

    return html;
  }

  /**
   * Checks the balance up front so a broke user never triggers a paid call,
   * but debits only once the extraction succeeded: a throttled provider used
   * to burn the user's credits and still return an error.
   */
  private async extractWithCredits<T>(
    userEmail: string,
    extract: () => Promise<T>,
  ): Promise<T> {
    await this.creditsService.assertSufficientCredits(
      AI_CREDIT_ACTION_OFFER_ENRICHMENT,
      userEmail,
    );

    const extracted = await extract();

    await this.creditsService.consumeCredits({
      action: AI_CREDIT_ACTION_OFFER_ENRICHMENT,
      userEmail,
    });

    return extracted;
  }

  private async extractStructuredFields(
    offerText: string,
    metadata: {
      description: string | null;
      siteName: string | null;
      title: string | null;
    },
    offerUrl: string | null,
    sourceType: DraftApplication["sourceType"],
  ) {
    const response = await withOpenRouterHttpErrors(() =>
      this.openRouterService.chat(
        [
          {
            role: "system",
            content:
              "You extract structured job-offer data. Return JSON only with keys: title, companyName, location, contractType, salaryRange, summary, responsibilities, requirements, language.",
          },
          {
            role: "user",
            content: JSON.stringify({
              description: metadata.description,
              offerText,
              offerUrl,
              sourceType,
              siteName: metadata.siteName,
              titleHint: metadata.title,
            }),
          },
        ],
        { temperature: 0 },
      ),
    );

    const payload = extractFirstJsonObject(response);

    return normalizeExtractedFields(payload, {
      description: metadata.description,
      offerText,
      siteName: metadata.siteName,
      title: metadata.title,
    });
  }
}

function stripRawOfferText(application: StoredApplication): DraftApplication {
  const {
    rawOfferText: _rawOfferText,
    cvContent: _cvContent,
    letterContent: _letterContent,
    ...draftApplication
  } = application;

  return draftApplication;
}

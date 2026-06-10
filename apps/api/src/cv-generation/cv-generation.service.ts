import {
  type CVDocumentContent,
  type CVDocumentVersionEntry,
  type CvContentUpdateRequest,
  type CvGenerationRequest,
  type LetterContentUpdateRequest,
  type LetterDocumentContent,
  type LetterDocumentVersionEntry,
  type LetterGenerationRequest,
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_LETTER_GENERATION,
  TEMPLATE_KIND_CV,
  TEMPLATE_KIND_LETTER,
} from "@cvforge/types";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { ApplicationsStore } from "../applications/applications.types";
import type { StoredApplication } from "../applications/applications.types";
import type { CreditsService } from "../credits/credits.service";
import type { TemplatesStore } from "../templates/templates.types";

import {
  extractJsonFromContent,
  normalizeCvJson,
  normalizeLetterJson,
  normalizeUpdatedCvContent,
  normalizeUpdatedLetterContent,
  type RawCvJson,
  type RawLetterJson,
} from "./cv-generation.normalizers";
import {
  CV_SYSTEM_PROMPT,
  LETTER_SYSTEM_PROMPT,
} from "./cv-generation.prompts";

function assertLocalFieldsProvided(
  localFields: CvGenerationRequest["localFields"],
): void {
  if (!localFields?.lastName && !localFields?.phone && !localFields?.email) {
    throw new BadRequestException(
      "Les champs locaux (lastName, phone, email) doivent être fournis.",
    );
  }
}

function nextVersionNumber(
  versions: Array<{ versionNumber: number }> | undefined,
) {
  return (
    (versions?.reduce(
      (highest, version) => Math.max(highest, version.versionNumber),
      0,
    ) ?? 0) + 1
  );
}

function appendCvVersion(
  application: StoredApplication,
  content: CVDocumentContent,
  timestamp: string,
  source: CVDocumentVersionEntry["source"],
  templateId: string | null,
) {
  const versions = application.cvVersions ?? [];
  const versionNumber = nextVersionNumber(versions);

  return [
    ...versions,
    {
      content,
      createdAt: timestamp,
      id: `${application.id}-cv-v${versionNumber}`,
      source,
      templateId,
      versionNumber,
    },
  ];
}

function appendLetterVersion(
  application: StoredApplication,
  content: LetterDocumentContent,
  timestamp: string,
  source: LetterDocumentVersionEntry["source"],
  templateId: string | null,
) {
  const versions = application.letterVersions ?? [];
  const versionNumber = nextVersionNumber(versions);

  return [
    ...versions,
    {
      content,
      createdAt: timestamp,
      id: `${application.id}-letter-v${versionNumber}`,
      source,
      templateId,
      versionNumber,
    },
  ];
}

@Injectable()
export class CvGenerationService {
  constructor(
    private readonly store: ApplicationsStore,
    private readonly openRouterService: OpenRouterService,
    private readonly creditsService: CreditsService,
    private readonly templatesStore?: Pick<TemplatesStore, "list">,
  ) {}

  async generateCv(
    userEmail: string,
    applicationId: string,
    request: CvGenerationRequest,
  ): Promise<CVDocumentContent> {
    assertLocalFieldsProvided(request.localFields);
    const application = this.getApplicationForUser(userEmail, applicationId);
    const offerContext = this.buildOfferContext(application);
    this.creditsService.consumeCredits({
      action: AI_CREDIT_ACTION_CV_GENERATION,
      applicationId,
      userEmail,
    });

    const rawResponse = await this.openRouterService.chat(
      [
        { role: "system", content: CV_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            pseudonymisedProfile: request.promptProfile,
            offerContext,
          }),
        },
      ],
      { temperature: 0.1 },
    );

    const rawJson = extractJsonFromContent<RawCvJson>(rawResponse);
    const cvContent = normalizeCvJson(
      rawJson,
      request.localFields,
      request.promptProfile,
    );
    const cvTemplateId = this.resolveDefaultTemplateId(TEMPLATE_KIND_CV);

    const timestamp = new Date().toISOString();
    const resolvedTemplateId = cvTemplateId ?? application.cvTemplateId ?? null;
    this.store.save({
      ...application,
      cvContent,
      cvGeneratedAt: timestamp,
      cvTemplateId: resolvedTemplateId,
      cvVersions: appendCvVersion(
        application,
        cvContent,
        timestamp,
        "generation",
        resolvedTemplateId,
      ),
      updatedAt: timestamp,
    });

    return cvContent;
  }

  async generateLetter(
    userEmail: string,
    applicationId: string,
    request: LetterGenerationRequest,
  ): Promise<LetterDocumentContent> {
    assertLocalFieldsProvided(request.localFields);
    const application = this.getApplicationForUser(userEmail, applicationId);
    const offerContext = this.buildOfferContext(application);
    this.creditsService.consumeCredits({
      action: AI_CREDIT_ACTION_LETTER_GENERATION,
      applicationId,
      userEmail,
    });

    const userPayload: Record<string, unknown> = {
      pseudonymisedProfile: request.promptProfile,
      offerContext,
    };
    if (request.refinement?.trim()) {
      userPayload.refinement = request.refinement.trim();
    }

    const rawResponse = await this.openRouterService.chat(
      [
        { role: "system", content: LETTER_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      { temperature: 0.4 },
    );

    const rawJson = extractJsonFromContent<RawLetterJson>(rawResponse);
    const letterContent = normalizeLetterJson(
      rawJson,
      request.localFields,
      application.extracted.companyName,
      application.extracted.location,
      `Candidature au poste de ${application.extracted.title}`,
    );
    const letterTemplateId =
      this.resolveDefaultTemplateId(TEMPLATE_KIND_LETTER);

    const timestamp = new Date().toISOString();
    const resolvedTemplateId =
      letterTemplateId ?? application.letterTemplateId ?? null;
    this.store.save({
      ...application,
      letterContent,
      letterGeneratedAt: timestamp,
      letterTemplateId: resolvedTemplateId,
      letterVersions: appendLetterVersion(
        application,
        letterContent,
        timestamp,
        "generation",
        resolvedTemplateId,
      ),
      updatedAt: timestamp,
    });

    return letterContent;
  }

  updateCvContent(
    userEmail: string,
    applicationId: string,
    request: CvContentUpdateRequest,
  ): CVDocumentContent {
    const application = this.store.findByIdForUserEmail(
      userEmail,
      applicationId,
    );

    if (!application) {
      throw new NotFoundException("La candidature est introuvable.");
    }

    const cvContent = normalizeUpdatedCvContent(request.cvContent);
    const timestamp = new Date().toISOString();
    const cvTemplateId =
      application.cvTemplateId ??
      this.resolveDefaultTemplateId(TEMPLATE_KIND_CV);

    this.store.save({
      ...application,
      cvContent,
      cvGeneratedAt: application.cvGeneratedAt ?? timestamp,
      cvTemplateId,
      cvVersions: appendCvVersion(
        application,
        cvContent,
        timestamp,
        "manual_save",
        cvTemplateId ?? null,
      ),
      updatedAt: timestamp,
    });

    return cvContent;
  }

  getCvContent(
    userEmail: string,
    applicationId: string,
  ): CVDocumentContent | null {
    const application = this.getApplicationForUser(userEmail, applicationId);
    return application.cvContent ?? null;
  }

  listCvVersions(
    userEmail: string,
    applicationId: string,
  ): CVDocumentVersionEntry[] {
    const application = this.getApplicationForUser(userEmail, applicationId);
    return [...(application.cvVersions ?? [])].sort(
      (left, right) => right.versionNumber - left.versionNumber,
    );
  }

  updateLetterContent(
    userEmail: string,
    applicationId: string,
    request: LetterContentUpdateRequest,
  ): LetterDocumentContent {
    const application = this.getApplicationForUser(userEmail, applicationId);
    const letterContent = normalizeUpdatedLetterContent(request.letterContent);
    const timestamp = new Date().toISOString();
    const letterTemplateId =
      application.letterTemplateId ??
      this.resolveDefaultTemplateId(TEMPLATE_KIND_LETTER);

    this.store.save({
      ...application,
      letterContent,
      letterGeneratedAt: application.letterGeneratedAt ?? timestamp,
      letterTemplateId,
      letterVersions: appendLetterVersion(
        application,
        letterContent,
        timestamp,
        "manual_save",
        letterTemplateId ?? null,
      ),
      updatedAt: timestamp,
    });

    return letterContent;
  }

  getLetterContent(
    userEmail: string,
    applicationId: string,
  ): LetterDocumentContent | null {
    const application = this.getApplicationForUser(userEmail, applicationId);
    return application.letterContent ?? null;
  }

  listLetterVersions(
    userEmail: string,
    applicationId: string,
  ): LetterDocumentVersionEntry[] {
    const application = this.getApplicationForUser(userEmail, applicationId);
    return [...(application.letterVersions ?? [])].sort(
      (left, right) => right.versionNumber - left.versionNumber,
    );
  }

  private getApplicationForUser(userEmail: string, applicationId: string) {
    const application = this.store.findByIdForUserEmail(
      userEmail,
      applicationId,
    );

    if (!application) {
      throw new NotFoundException("La candidature est introuvable.");
    }

    return application;
  }

  private buildOfferContext(
    application: NonNullable<
      ReturnType<ApplicationsStore["findByIdForUserEmail"]>
    >,
  ) {
    return {
      title: application.extracted.title,
      companyName: application.extracted.companyName,
      requirements: application.extracted.requirements,
      responsibilities: application.extracted.responsibilities,
      summary: application.extracted.summary,
      language: application.extracted.language,
      rawOfferText: application.rawOfferText.slice(0, 4000),
    };
  }

  private resolveDefaultTemplateId(
    kind: typeof TEMPLATE_KIND_CV | typeof TEMPLATE_KIND_LETTER,
  ) {
    const templates = this.templatesStore?.list() ?? [];
    const defaultTemplate =
      templates.find(
        (template) => template.kind === kind && template.isDefault,
      ) ?? templates.find((template) => template.kind === kind);

    return defaultTemplate?.id ?? null;
  }
}

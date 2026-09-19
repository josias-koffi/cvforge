import {
  type CVDocumentContent,
  type CVDocumentVersionEntry,
  type CvContentUpdateRequest,
  type CvGenerationRequest,
  type LetterContentUpdateRequest,
  type LetterDocumentContent,
  type LetterDocumentVersionEntry,
  type LetterGenerationRequest,
  type Locale,
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_LETTER_GENERATION,
  TEMPLATE_KIND_CV,
  TEMPLATE_KIND_LETTER,
} from "@cvforge/types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { withOpenRouterHttpErrors } from "../ai/openrouter.exception";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { ApplicationsStore } from "../applications/applications.types";
import type { CreditsService } from "../credits/credits.service";
import type { TemplatesStore } from "../templates/templates.types";

import { groundCvContent } from "./grounding";
import { buildGroundedUserMessage } from "./cv-generation.payload";
import {
  assertLocalFieldsProvided,
  assertProfileIsGroundable,
  assertTargetLanguage,
} from "./cv-generation.guards";
import {
  appendCvVersion,
  appendLetterVersion,
} from "./cv-generation.versions";

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
import {
  translateStoredCv,
  translateStoredLetter,
} from "./cv-generation.translate";

function fallbackLetterObject(language: Locale, title: string) {
  return language === "en"
    ? `Application for the position of ${title}`
    : `Candidature au poste de ${title}`;
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
    assertProfileIsGroundable(request.promptProfile);
    assertLocalFieldsProvided(request.localFields);
    const application = await this.getApplicationForUser(
      userEmail,
      applicationId,
    );
    const offerContext = this.buildOfferContext(application);
    await this.creditsService.assertSufficientCredits(
      AI_CREDIT_ACTION_CV_GENERATION,
      userEmail,
    );

    const rawResponse = await withOpenRouterHttpErrors(() =>
      this.openRouterService.chat(
        [
          { role: "system", content: CV_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildGroundedUserMessage(
              request.promptProfile,
              offerContext,
            ),
          },
        ],
        { temperature: 0.1 },
      ),
    );

    const rawJson = extractJsonFromContent<RawCvJson>(rawResponse);
    const cvContent: CVDocumentContent = {
      ...groundCvContent(
        normalizeCvJson(rawJson, request.localFields, request.promptProfile),
        request.promptProfile,
      ),
      language: offerContext.language,
    };
    const cvTemplateId = await this.resolveDefaultTemplateId(TEMPLATE_KIND_CV);

    // Charged only once the output has been parsed, normalised and grounded.
    await this.creditsService.consumeCredits({
      action: AI_CREDIT_ACTION_CV_GENERATION,
      applicationId,
      userEmail,
    });

    const timestamp = new Date().toISOString();
    const resolvedTemplateId = cvTemplateId ?? application.cvTemplateId ?? null;
    await this.store.save({
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
    assertProfileIsGroundable(request.promptProfile);
    assertLocalFieldsProvided(request.localFields);
    const application = await this.getApplicationForUser(
      userEmail,
      applicationId,
    );
    const offerContext = this.buildOfferContext(application);
    await this.creditsService.assertSufficientCredits(
      AI_CREDIT_ACTION_LETTER_GENERATION,
      userEmail,
    );

    const rawResponse = await withOpenRouterHttpErrors(() =>
      this.openRouterService.chat(
        [
          { role: "system", content: LETTER_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildGroundedUserMessage(
              request.promptProfile,
              offerContext,
              { includePreferences: true, refinement: request.refinement },
            ),
          },
        ],
        { temperature: 0.25 },
      ),
    );

    const rawJson = extractJsonFromContent<RawLetterJson>(rawResponse);
    const letterContent: LetterDocumentContent = {
      ...normalizeLetterJson(
        rawJson,
        request.localFields,
        application.extracted.companyName,
        application.extracted.location,
        fallbackLetterObject(
          offerContext.language,
          application.extracted.title,
        ),
      ),
      language: offerContext.language,
    };
    const letterTemplateId =
      await this.resolveDefaultTemplateId(TEMPLATE_KIND_LETTER);

    // Charged only once the output has been parsed and normalised.
    await this.creditsService.consumeCredits({
      action: AI_CREDIT_ACTION_LETTER_GENERATION,
      applicationId,
      userEmail,
    });

    const timestamp = new Date().toISOString();
    const resolvedTemplateId =
      letterTemplateId ?? application.letterTemplateId ?? null;
    await this.store.save({
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

  async translateCv(
    userEmail: string,
    applicationId: string,
    targetLanguage: unknown,
  ): Promise<CVDocumentContent> {
    const language = assertTargetLanguage(targetLanguage);
    const application = await this.getApplicationForUser(
      userEmail,
      applicationId,
    );

    return translateStoredCv(this.translationDeps(), application, userEmail, language);
  }

  async translateLetter(
    userEmail: string,
    applicationId: string,
    targetLanguage: unknown,
  ): Promise<LetterDocumentContent> {
    const language = assertTargetLanguage(targetLanguage);
    const application = await this.getApplicationForUser(
      userEmail,
      applicationId,
    );

    return translateStoredLetter(
      this.translationDeps(),
      application,
      userEmail,
      language,
    );
  }

  private translationDeps() {
    return {
      creditsService: this.creditsService,
      openRouterService: this.openRouterService,
      store: this.store,
    };
  }

  async updateCvContent(
    userEmail: string,
    applicationId: string,
    request: CvContentUpdateRequest,
  ): Promise<CVDocumentContent> {
    const application = await this.store.findByIdForUserEmail(
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
      (await this.resolveDefaultTemplateId(TEMPLATE_KIND_CV));

    await this.store.save({
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

  async getCvContent(
    userEmail: string,
    applicationId: string,
  ): Promise<CVDocumentContent | null> {
    const application = await this.getApplicationForUser(
      userEmail,
      applicationId,
    );
    return application.cvContent ?? null;
  }

  async listCvVersions(
    userEmail: string,
    applicationId: string,
  ): Promise<CVDocumentVersionEntry[]> {
    const application = await this.getApplicationForUser(
      userEmail,
      applicationId,
    );
    return [...(application.cvVersions ?? [])].sort(
      (left, right) => right.versionNumber - left.versionNumber,
    );
  }

  async updateLetterContent(
    userEmail: string,
    applicationId: string,
    request: LetterContentUpdateRequest,
  ): Promise<LetterDocumentContent> {
    const application = await this.getApplicationForUser(
      userEmail,
      applicationId,
    );
    const letterContent = normalizeUpdatedLetterContent(request.letterContent);
    const timestamp = new Date().toISOString();
    const letterTemplateId =
      application.letterTemplateId ??
      (await this.resolveDefaultTemplateId(TEMPLATE_KIND_LETTER));

    await this.store.save({
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

  async getLetterContent(
    userEmail: string,
    applicationId: string,
  ): Promise<LetterDocumentContent | null> {
    const application = await this.getApplicationForUser(
      userEmail,
      applicationId,
    );
    return application.letterContent ?? null;
  }

  async listLetterVersions(
    userEmail: string,
    applicationId: string,
  ): Promise<LetterDocumentVersionEntry[]> {
    const application = await this.getApplicationForUser(
      userEmail,
      applicationId,
    );
    return [...(application.letterVersions ?? [])].sort(
      (left, right) => right.versionNumber - left.versionNumber,
    );
  }

  private async getApplicationForUser(userEmail: string, applicationId: string) {
    const application = await this.store.findByIdForUserEmail(
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
      Awaited<ReturnType<ApplicationsStore["findByIdForUserEmail"]>>
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

  private async resolveDefaultTemplateId(
    kind: typeof TEMPLATE_KIND_CV | typeof TEMPLATE_KIND_LETTER,
  ) {
    const templates = (await this.templatesStore?.list()) ?? [];
    const defaultTemplate =
      templates.find(
        (template) => template.kind === kind && template.isDefault,
      ) ?? templates.find((template) => template.kind === kind);

    return defaultTemplate?.id ?? null;
  }
}

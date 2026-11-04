import {
  type CVDocumentContent,
  type LetterDocumentContent,
  type Locale,
} from "@cvforge/types";
import { NotFoundException } from "@nestjs/common";
import { withOpenRouterHttpErrors } from "../ai/openrouter.exception";
import type { OpenRouterService } from "../ai/openrouter.service";
import type {
  ApplicationsStore,
  StoredApplication,
} from "../applications/applications.types";
import type { FreeActionLimiter } from "../credits/free-action-limiter";

import { extractJsonFromContent } from "./cv-generation.normalizers";
import {
  CV_TRANSLATION_SYSTEM_PROMPT,
  LETTER_TRANSLATION_SYSTEM_PROMPT,
} from "./cv-generation.prompts";
import {
  buildCvTranslationPayload,
  buildLetterTranslationPayload,
  mergeTranslatedCv,
  mergeTranslatedLetter,
} from "./cv-generation.translation";
import {
  appendCvVersion,
  appendLetterVersion,
} from "./cv-generation.versions";

export interface TranslationDeps {
  /** Translating is free of credits; this cap is what stops a loop. */
  limiter: Pick<FreeActionLimiter, "assertWithinLimit">;
  openRouterService: Pick<OpenRouterService, "chat">;
  store: Pick<ApplicationsStore, "save">;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

async function requestTranslation(
  deps: TranslationDeps,
  systemPrompt: string,
  payload: object,
) {
  const rawResponse = await withOpenRouterHttpErrors(() =>
    deps.openRouterService.chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(payload) },
      ],
      { feature: "cv_translation", temperature: 0.1 },
    ),
  );
  return extractJsonFromContent<unknown>(rawResponse);
}

export async function translateStoredCv(
  deps: TranslationDeps,
  application: StoredApplication,
  userEmail: string,
  language: Locale,
): Promise<CVDocumentContent> {
  if (!application.cvContent) {
    throw new NotFoundException("Aucun CV généré pour cette candidature.");
  }
  deps.limiter.assertWithinLimit("cv_translation", userEmail);

  const rawJson = await requestTranslation(deps, CV_TRANSLATION_SYSTEM_PROMPT, {
    targetLanguage: language,
    cv: buildCvTranslationPayload(application.cvContent),
  });
  const translated = mergeTranslatedCv(
    application.cvContent,
    asRecord(rawJson).cv ?? rawJson,
    language,
  );

  const timestamp = new Date().toISOString();
  deps.store.save({
    ...application,
    cvContent: translated,
    cvVersions: appendCvVersion(
      application,
      translated,
      timestamp,
      "translation",
      application.cvTemplateId ?? null,
    ),
    updatedAt: timestamp,
  });

  return translated;
}

export async function translateStoredLetter(
  deps: TranslationDeps,
  application: StoredApplication,
  userEmail: string,
  language: Locale,
): Promise<LetterDocumentContent> {
  if (!application.letterContent) {
    throw new NotFoundException("Aucune lettre générée pour cette candidature.");
  }
  deps.limiter.assertWithinLimit("cv_translation", userEmail);

  const rawJson = await requestTranslation(
    deps,
    LETTER_TRANSLATION_SYSTEM_PROMPT,
    {
      targetLanguage: language,
      letter: buildLetterTranslationPayload(application.letterContent),
    },
  );
  const translated = mergeTranslatedLetter(
    application.letterContent,
    asRecord(rawJson).letter ?? rawJson,
    language,
  );

  const timestamp = new Date().toISOString();
  deps.store.save({
    ...application,
    letterContent: translated,
    letterVersions: appendLetterVersion(
      application,
      translated,
      timestamp,
      "translation",
      application.letterTemplateId ?? null,
    ),
    updatedAt: timestamp,
  });

  return translated;
}

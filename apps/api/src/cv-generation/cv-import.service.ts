import {
  AI_CREDIT_ACTION_CV_IMPORT,
  type ImportedCvExtractionResult,
  type ImportedCvProfilePatch,
} from "@cvforge/types";
import { BadRequestException, Injectable, UnprocessableEntityException } from "@nestjs/common";
import { withOpenRouterHttpErrors } from "../ai/openrouter.exception";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { CreditsService } from "../credits/credits.service";
import { pseudonymizeCvText } from "./cv-pseudonymizer";
import {
  extractCvText,
  MIN_EXTRACTED_TEXT_LENGTH,
  type CvSourceFile,
} from "./cv-text-extraction";

/** Kept as the module's own name for the upload shape the controller passes in. */
export type CvImportFile = CvSourceFile;

type RawImportedProfile = Partial<ImportedCvProfilePatch>;

export const MAX_CV_IMPORT_BYTES = 5 * 1024 * 1024;
const CV_IMPORT_OMITTED_FIELDS = [
  "identity.lastName",
  "identity.phone",
  "identity.email",
  "identity.exactAddress",
  "additional.birthDate",
] as const;

const QUALITY_LIMITS = [
  "Les PDF scannes sont lus par OCR local (4 premieres pages) : la qualite depend de la resolution du scan.",
  "Les mises en page multi-colonnes, tableaux, icones et barres de progression peuvent etre interpretes dans le mauvais ordre.",
  "Les dates, niveaux de langue et competences doivent etre relus avant sauvegarde.",
  "Les donnees directement identifiantes detectees sont retirees avant l'appel IA et doivent etre corrigees localement si necessaire.",
] as const;

const CV_IMPORT_SYSTEM_PROMPT = `Tu extrais un profil de base depuis le texte pseudonymise d'un CV.

Règles impératives :
1. Le texte source a deja retire email, telephone, adresse exacte, date de naissance et nom de famille detecte.
2. Ne reconstruis jamais un nom de famille, email, telephone, adresse exacte ou date de naissance.
3. Si une information manque, retourne une chaine vide ou un tableau vide.
4. Garde uniquement les donnees professionnelles utiles a un profil de base.
5. Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "headline": "",
  "identity": {
    "city": "",
    "firstName": "",
    "github": "",
    "linkedIn": "",
    "portfolio": ""
  },
  "sections": {
    "certifications": [{ "issuer": "", "title": "", "year": "" }],
    "education": [{ "degree": "", "honors": "", "institution": "", "year": "" }],
    "experiences": [{ "company": "", "period": "", "results": "", "role": "" }],
    "interests": "",
    "languages": [{ "language": "", "level": "" }],
    "personalProjects": [{ "description": "", "link": "", "title": "" }],
    "softSkills": [],
    "summary": "",
    "technicalSkills": []
  }
}`;

function normalizeText(value: unknown, max = 600) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeTextList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeText(entry, 80))
    .filter(Boolean)
    .slice(0, 20);
}

function extractFirstJsonObject(rawContent: string): RawImportedProfile {
  const fencedMatch = rawContent.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? rawContent;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new UnprocessableEntityException(
      "Le service d'extraction CV n'a pas retourne un JSON exploitable.",
    );
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as RawImportedProfile;
  } catch {
    throw new UnprocessableEntityException(
      "Le service d'extraction CV a retourne un JSON invalide.",
    );
  }
}

function normalizeImportedProfile(raw: RawImportedProfile): ImportedCvProfilePatch {
  const identity: Partial<ImportedCvProfilePatch["identity"]> =
    raw.identity ?? {};
  const sections: Partial<ImportedCvProfilePatch["sections"]> =
    raw.sections ?? {};

  return {
    headline: normalizeText(raw.headline, 120),
    identity: {
      city: normalizeText(identity.city, 120),
      firstName: normalizeText(identity.firstName, 80),
      github: normalizeText(identity.github, 240),
      linkedIn: normalizeText(identity.linkedIn, 240),
      portfolio: normalizeText(identity.portfolio, 240),
    },
    sections: {
      certifications: Array.isArray(sections.certifications)
        ? sections.certifications.map((entry) => ({
            issuer: normalizeText(entry.issuer, 120),
            title: normalizeText(entry.title, 120),
            year: normalizeText(entry.year, 16),
          }))
        : [],
      education: Array.isArray(sections.education)
        ? sections.education.map((entry) => ({
            degree: normalizeText(entry.degree, 120),
            honors: normalizeText(entry.honors, 120),
            institution: normalizeText(entry.institution, 120),
            year: normalizeText(entry.year, 16),
          }))
        : [],
      experiences: Array.isArray(sections.experiences)
        ? sections.experiences.map((entry) => ({
            company: normalizeText(entry.company, 120),
            period: normalizeText(entry.period, 80),
            results: normalizeText(entry.results, 600),
            role: normalizeText(entry.role, 120),
          }))
        : [],
      interests: normalizeText(sections.interests, 400),
      languages: Array.isArray(sections.languages)
        ? sections.languages.map((entry) => ({
            language: normalizeText(entry.language, 60),
            level: normalizeText(entry.level, 60),
          }))
        : [],
      personalProjects: Array.isArray(sections.personalProjects)
        ? sections.personalProjects.map((entry) => ({
            description: normalizeText(entry.description, 600),
            link: normalizeText(entry.link, 240),
            title: normalizeText(entry.title, 120),
          }))
        : [],
      softSkills: normalizeTextList(sections.softSkills),
      summary: normalizeText(sections.summary, 1200),
      technicalSkills: normalizeTextList(sections.technicalSkills),
    },
  };
}

function hasExtractedContent(profile: ImportedCvProfilePatch) {
  const { identity, sections } = profile;

  return Boolean(
    profile.headline ||
      identity.firstName ||
      sections.summary ||
      sections.experiences.length ||
      sections.education.length ||
      sections.technicalSkills.length ||
      sections.softSkills.length,
  );
}

@Injectable()
export class CvImportService {
  constructor(
    private readonly openRouterService: OpenRouterService,
    private readonly creditsService: CreditsService,
  ) {}

  async extractProfileFromCv(
    userEmail: string,
    file: CvImportFile | undefined,
  ): Promise<ImportedCvExtractionResult> {
    if (!file) {
      throw new BadRequestException("Un fichier CV est requis.");
    }

    if (file.size > MAX_CV_IMPORT_BYTES) {
      throw new BadRequestException("Le fichier CV doit peser moins de 5 Mo.");
    }

    const { text } = await extractCvText(file);

    if (text.length < MIN_EXTRACTED_TEXT_LENGTH) {
      throw new UnprocessableEntityException(
        "Le CV ne contient pas assez de texte exploitable pour l'extraction.",
      );
    }

    await this.creditsService.assertSufficientCredits(
      AI_CREDIT_ACTION_CV_IMPORT,
      userEmail,
    );

    const pseudonymized = pseudonymizeCvText(text);

    const rawResponse = await withOpenRouterHttpErrors(() =>
      this.openRouterService.chat(
        [
          { role: "system", content: CV_IMPORT_SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              candidateHint: {
                firstName: pseudonymized.firstName,
                lastName: "[CANDIDATE]",
              },
              pseudonymisedCvText: pseudonymized.text,
            }),
          },
        ],
        { temperature: 0.2 },
      ),
    );

    const extractedProfile = normalizeImportedProfile(extractFirstJsonObject(rawResponse));

    if (!hasExtractedContent(extractedProfile)) {
      throw new UnprocessableEntityException(
        "Aucune information exploitable n'a ete trouvee dans ce CV.",
      );
    }

    // Charged only once the extraction produced usable data.
    await this.creditsService.consumeCredits({
      action: AI_CREDIT_ACTION_CV_IMPORT,
      userEmail,
    });

    return {
      extractedProfile,
      omittedFields: [...CV_IMPORT_OMITTED_FIELDS],
      qualityLimits: [...QUALITY_LIMITS],
      source: {
        filename: file.originalname,
        mimeType: file.mimetype,
        textLength: text.length,
      },
    };
  }

}

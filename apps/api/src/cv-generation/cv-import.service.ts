import {
  AI_CREDIT_ACTION_CV_IMPORT,
  type ImportedCvExtractionResult,
  type ImportedCvProfilePatch,
} from "@cvforge/types";
import { BadRequestException, Injectable, UnprocessableEntityException } from "@nestjs/common";
import mammoth from "mammoth";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { CreditsService } from "../credits/credits.service";

export type CvImportFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

type RawImportedProfile = Partial<ImportedCvProfilePatch>;

const MAX_CV_IMPORT_BYTES = 5 * 1024 * 1024;
const MIN_EXTRACTED_TEXT_LENGTH = 120;
const CV_IMPORT_OMITTED_FIELDS = [
  "identity.lastName",
  "identity.phone",
  "identity.email",
  "identity.exactAddress",
  "additional.birthDate",
] as const;

const QUALITY_LIMITS = [
  "Les PDF image ou scannes sans couche texte peuvent produire une extraction partielle.",
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

function extractPdfTextHeuristically(buffer: Buffer) {
  const latinText = buffer
    .toString("latin1")
    .replace(/\0/g, " ")
    .replace(/\\r|\\n/g, " ")
    .replace(/[^\x20-\x7EÀ-ÿ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return latinText;
}

function pseudonymizeCvText(rawText: string) {
  const firstLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);
  const possibleName = firstLines
    .map((line) => line.match(/^([A-ZÀ-Ý][A-Za-zÀ-ÿ'-]+)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ'-]+)/))
    .find(Boolean);
  const firstName = possibleName?.[1] ?? "";
  const lastName = possibleName?.[2] ?? "";

  let text = rawText
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL_OMITTED]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[PHONE_OMITTED]")
    .replace(/\b(?:date de naissance|birth date|born)\s*[:-]?\s*[^\n\r]+/gi, "[BIRTH_DATE_OMITTED]")
    .replace(/\b(?:adresse|address)\s*[:-]?\s*[^\n\r]+/gi, "[ADDRESS_OMITTED]");

  if (lastName) {
    text = text.replace(new RegExp(`\\b${lastName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "[CANDIDATE]");
  }

  return { firstName, text };
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

    const text = await this.extractText(file);

    if (text.length < MIN_EXTRACTED_TEXT_LENGTH) {
      throw new UnprocessableEntityException(
        "Le CV ne contient pas assez de texte exploitable pour l'extraction.",
      );
    }

    const pseudonymized = pseudonymizeCvText(text);
    this.creditsService.consumeCredits({
      action: AI_CREDIT_ACTION_CV_IMPORT,
      userEmail,
    });

    const rawResponse = await this.openRouterService.chat(
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
    );

    return {
      extractedProfile: normalizeImportedProfile(extractFirstJsonObject(rawResponse)),
      omittedFields: [...CV_IMPORT_OMITTED_FIELDS],
      qualityLimits: [...QUALITY_LIMITS],
      source: {
        filename: file.originalname,
        mimeType: file.mimetype,
        textLength: text.length,
      },
    };
  }

  private async extractText(file: CvImportFile) {
    const filename = file.originalname.toLowerCase();

    if (
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      filename.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });

      return result.value.trim();
    }

    if (file.mimetype === "application/pdf" || filename.endsWith(".pdf")) {
      return extractPdfTextHeuristically(file.buffer);
    }

    throw new BadRequestException("Seuls les fichiers PDF et DOCX sont acceptes.");
  }
}

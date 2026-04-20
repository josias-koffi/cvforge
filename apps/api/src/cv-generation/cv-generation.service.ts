import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  CVDocumentContent,
  CvGenerationRequest,
  EducationItemProps,
  ExperienceItemProps,
  LanguageItemProps,
  CertificationItemProps,
  ProjectItemProps,
} from "@cvforge/types";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { ApplicationsStore } from "../applications/applications.types";

// CV generation prompt based on vision §8.1
const CV_SYSTEM_PROMPT = `Tu es un Expert en Recrutement Senior et Spécialiste ATS.
À partir du profil pseudonymisé du candidat et du texte de l'offre fournis, génère un CV optimisé ATS.

Règles impératives :
1. Analyse les 5 hard-skills et 3 soft-skills prioritaires de l'offre.
2. Adapte le titre professionnel et l'accroche au poste.
3. Reformule les expériences avec des verbes d'action et les mots-clés de l'offre.
4. Regroupe les compétences pour les scanners ATS.
5. Détecte la langue de l'offre et rédige le CV dans cette langue.
6. Utilise "[CANDIDATE]" comme nom de famille — ne l'invente pas.
7. Ne génère JAMAIS de numéro de téléphone ni d'adresse email.
8. Laisse les champs phone et email vides ("").

Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "candidate": {
    "firstName": "",
    "lastName": "[CANDIDATE]",
    "title": "",
    "summary": "",
    "phone": "",
    "email": "",
    "city": "",
    "linkedin": "",
    "github": ""
  },
  "experiences": [
    {
      "company": "",
      "position": "",
      "startDate": "",
      "endDate": "",
      "description": "",
      "achievements": []
    }
  ],
  "education": [
    { "degree": "", "institution": "", "year": "", "mention": "" }
  ],
  "skills": { "hard": [], "soft": [] },
  "certifications": [{ "title": "", "issuer": "", "year": "" }],
  "languages": [{ "language": "", "level": "" }],
  "projects": [{ "title": "", "description": "", "url": "" }]
}`;

type RawCvJson = {
  candidate?: {
    firstName?: unknown;
    lastName?: unknown;
    title?: unknown;
    summary?: unknown;
    phone?: unknown;
    email?: unknown;
    city?: unknown;
    linkedin?: unknown;
    github?: unknown;
  };
  experiences?: unknown[];
  education?: unknown[];
  skills?: { hard?: unknown; soft?: unknown };
  certifications?: unknown[];
  languages?: unknown[];
  projects?: unknown[];
};

function toStr(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim();
}

function toStrArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

function normalizeExperiences(raw: unknown[]): ExperienceItemProps[] {
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const e = item as Record<string, unknown>;
      return {
        achievements: toStrArray(e.achievements),
        company: toStr(e.company),
        description: toStr(e.description),
        endDate: toStr(e.endDate),
        position: toStr(e.position),
        startDate: toStr(e.startDate),
      };
    })
    .filter((e): e is ExperienceItemProps => e !== null);
}

function normalizeEducation(raw: unknown[]): EducationItemProps[] {
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const e = item as Record<string, unknown>;
      return {
        degree: toStr(e.degree),
        institution: toStr(e.institution),
        mention: toStr(e.mention),
        year: toStr(e.year),
      };
    })
    .filter((e): e is EducationItemProps => e !== null);
}

function normalizeCertifications(raw: unknown[]): CertificationItemProps[] {
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const c = item as Record<string, unknown>;
      return {
        issuer: toStr(c.issuer),
        title: toStr(c.title),
        year: toStr(c.year),
      };
    })
    .filter((c): c is CertificationItemProps => c !== null);
}

function normalizeLanguages(raw: unknown[]): LanguageItemProps[] {
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const l = item as Record<string, unknown>;
      return {
        language: toStr(l.language),
        level: toStr(l.level),
      };
    })
    .filter((l): l is LanguageItemProps => l !== null);
}

function normalizeProjects(raw: unknown[]): ProjectItemProps[] {
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const p = item as Record<string, unknown>;
      return {
        description: toStr(p.description),
        title: toStr(p.title),
        url: toStr(p.url),
      };
    })
    .filter((p): p is ProjectItemProps => p !== null);
}

function extractJsonFromContent(raw: string): RawCvJson {
  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new UnprocessableEntityException(
      "La génération IA n'a pas retourné un JSON exploitable.",
    );
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as RawCvJson;
  } catch {
    throw new UnprocessableEntityException(
      "La génération IA a retourné un JSON invalide.",
    );
  }
}

function normalizeCvJson(
  raw: RawCvJson,
  localFields: CvGenerationRequest["localFields"],
): CVDocumentContent {
  const candidate = raw.candidate ?? {};

  return {
    candidate: {
      city: toStr(candidate.city),
      email: localFields.email,
      firstName: toStr(candidate.firstName),
      github: toStr(candidate.github),
      lastName: localFields.lastName,
      linkedin: toStr(candidate.linkedin),
      phone: localFields.phone,
      summary: toStr(candidate.summary),
      title: toStr(candidate.title),
    },
    certifications: normalizeCertifications(
      Array.isArray(raw.certifications) ? raw.certifications : [],
    ),
    education: normalizeEducation(
      Array.isArray(raw.education) ? raw.education : [],
    ),
    experiences: normalizeExperiences(
      Array.isArray(raw.experiences) ? raw.experiences : [],
    ),
    languages: normalizeLanguages(
      Array.isArray(raw.languages) ? raw.languages : [],
    ),
    projects: normalizeProjects(
      Array.isArray(raw.projects) ? raw.projects : [],
    ),
    skills: {
      hard: toStrArray(raw.skills?.hard),
      soft: toStrArray(raw.skills?.soft),
    },
  };
}

@Injectable()
export class CvGenerationService {
  constructor(
    private readonly store: ApplicationsStore,
    private readonly openRouterService: OpenRouterService,
  ) {}

  async generateCv(
    userEmail: string,
    applicationId: string,
    request: CvGenerationRequest,
  ): Promise<CVDocumentContent> {
    if (!request.localFields?.lastName && !request.localFields?.phone && !request.localFields?.email) {
      throw new BadRequestException(
        "Les champs locaux (lastName, phone, email) doivent être fournis.",
      );
    }

    const application = this.store.findByIdForUserEmail(userEmail, applicationId);

    if (!application) {
      throw new NotFoundException("La candidature est introuvable.");
    }

    const offerContext = {
      title: application.extracted.title,
      companyName: application.extracted.companyName,
      requirements: application.extracted.requirements,
      responsibilities: application.extracted.responsibilities,
      summary: application.extracted.summary,
      language: application.extracted.language,
      rawOfferText: application.rawOfferText.slice(0, 4000),
    };

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
      { temperature: 0.3 },
    );

    const rawJson = extractJsonFromContent(rawResponse);
    const cvContent = normalizeCvJson(rawJson, request.localFields);

    const timestamp = new Date().toISOString();
    this.store.save({
      ...application,
      cvContent,
      cvGeneratedAt: timestamp,
      updatedAt: timestamp,
    });

    return cvContent;
  }

  getCvContent(
    userEmail: string,
    applicationId: string,
  ): CVDocumentContent | null {
    const application = this.store.findByIdForUserEmail(userEmail, applicationId);

    if (!application) {
      throw new NotFoundException("La candidature est introuvable.");
    }

    return application.cvContent ?? null;
  }
}

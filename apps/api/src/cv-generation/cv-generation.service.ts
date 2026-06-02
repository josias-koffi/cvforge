import {
  type CVDocumentContent,
  type CVDocumentVersionEntry,
  type CvContentUpdateRequest,
  type CvGenerationRequest,
  type LetterContentUpdateRequest,
  type LetterDocumentContent,
  type LetterDocumentVersionEntry,
  type LetterGenerationRequest,
  type EducationItemProps,
  type ExperienceItemProps,
  type LanguageItemProps,
  type CertificationItemProps,
  type ProjectItemProps,
  type SkillCategory,
  AI_CREDIT_ACTION_CV_GENERATION,
  AI_CREDIT_ACTION_LETTER_GENERATION,
  TEMPLATE_KIND_CV,
  TEMPLATE_KIND_LETTER,
} from "@cvforge/types";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { ApplicationsStore } from "../applications/applications.types";
import type { StoredApplication } from "../applications/applications.types";
import type { CreditsService } from "../credits/credits.service";
import type { TemplatesStore } from "../templates/templates.types";

// CV generation prompt based on vision §8.1
const CV_SYSTEM_PROMPT = `Tu es un Expert en Recrutement Senior et Spécialiste ATS.
À partir du profil pseudonymisé du candidat et du texte de l'offre fournis, génère un CV optimisé ATS.

Règles impératives :

TITRE PROFESSIONNEL (candidate.title) :
- Doit correspondre EXACTEMENT au poste visé dans l'offre (6-8 mots maximum, une seule ligne).

PROFIL / ACCROCHE (candidate.summary) :
- Ne jamais commencer par "Je suis", "Étudiant(e) en" ou "Passionné(e) par".
- Commencer par le titre métier ou la compétence principale.
- Structure : [Profil clé] + [X ans d'expérience] + [domaine de spécialité] + [valeur apportée].
- 3 lignes maximum (environ 40 mots). Pas de listes. Supprimer les formules creuses.
- Terminer sur ce que le candidat APPORTE, pas sur ce qu'il cherche.

EXPÉRIENCES (experiences[]) :
- description : une phrase de contexte obligatoire (secteur, taille de l'entreprise ou périmètre, portée géographique si pertinente). Maximum 15 mots.
- achievements : 3 à 4 items maximum pour le poste principal (CDI / temps plein). 2 items maximum pour les postes freelance ou secondaires. Chaque item commence par un verbe d'action fort (Piloté, Créé, Lancé, Développé, Géré, Conçu, Augmenté, Réduit…). Chaque item tient sur une seule ligne (max 12 mots). Chaque item doit idéalement contenir un résultat chiffré (%, nombre, volume, durée) ou décrire l'impact. Prioriser les bullets à impact fort ; supprimer les bullets de veille technologique ou généralistes.
- startDate / endDate : format OBLIGATOIRE "Jan. 2022" / "Fév. 2023" (abréviation 3 lettres + point + espace + année). Pour un poste en cours : "Présent". JAMAIS de format "2022-01" ou "YYYY-MM".

COMPÉTENCES CLÉS (skills.categories) :
- Générer exactement 3 catégories dans skills.categories. Ne jamais en générer plus.
- Catégorie 1 (label selon profil, ex. "Outils digitaux", "Stack technique", "Logiciels & Plateformes") : outils, logiciels, plateformes (Canva, HubSpot, Salesforce, Excel…). C'est ce que les ATS cherchent en priorité.
- Catégorie 2 (label selon profil, ex. "Compétences métier", "Savoir-faire opérationnel") : compétences métier et savoir-faire opérationnels.
- Catégorie 3 (label selon profil, ex. "Compétences transverses", "Soft skills", "Communication") : compétences transversales, soft skills ou compétence clé spécifique au poste.
- 6 à 10 items par catégorie. Chaque item : 1 à 3 mots maximum.
- Utiliser UNIQUEMENT des compétences déjà mentionnées ailleurs dans le CV — ne jamais inventer.
- skills.hard : tableau plat de TOUS les items de toutes les catégories (concaténation) — pour compatibilité.
- skills.soft : laisser vide ([]).

LANGUES (languages[]) :
- level : format OBLIGATOIRE "Niveau / Descriptif" (ex. "C1 / Courant", "B2 / Intermédiaire avancé", "TOEFL 110 / Courant"). Ne jamais écrire uniquement "Courant" sans niveau certifié.

FORMATION (education[]) :
- Les 3 formations les plus récentes uniquement.
- Chaque formation sur une ligne compacte. degree = intitulé du diplôme (sans "Bac+5" si le niveau RNCP est dans mention). institution = école / université. mention = niveau RNCP ou équivalent (ex. "RNCP Niv. 7"). year = année d'obtention.
- Diplômes antérieurs : omis ou condensés en un seul item à intitulé court.
- Corriger les fautes d'orthographe dans les intitulés de diplômes.

COHÉRENCE GLOBALE :
- Le titre, le résumé, les mots-clés d'expériences et les compétences doivent tous pointer vers le MÊME poste cible.
- Analyser les 5 hard-skills et 3 soft-skills prioritaires de l'offre et les intégrer.
- Détecter la langue de l'offre et rédiger le CV dans cette langue.
- Utiliser "[CANDIDATE]" comme nom de famille — ne l'inventer pas.
- Ne jamais générer de numéro de téléphone ni d'adresse email. Laisser phone et email vides ("").

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
  "skills": {
    "hard": [],
    "soft": [],
    "categories": [
      { "label": "", "items": [] }
    ]
  },
  "certifications": [{ "title": "", "issuer": "", "year": "" }],
  "languages": [{ "language": "", "level": "" }],
  "projects": [{ "title": "", "description": "", "url": "" }]
}`;

const LETTER_SYSTEM_PROMPT = `Tu es un Expert en Recrutement Senior et Spécialiste ATS.
À partir du profil pseudonymisé du candidat et du texte de l'offre fournis, génère une lettre de motivation ATS, sobre, crédible et percutante.

Règles impératives :
1. Utilise exactement les mêmes sources métier que pour le CV : profil pseudonymisé + contexte d'offre.
2. Détecte la langue de l'offre et rédige la lettre dans cette langue.
3. Structure la lettre en 4 paragraphes distincts :
   - paragraph1 : accroche en 2 phrases courtes — commence par ce que le candidat APPORTE concrètement, puis exprime sa motivation.
   - paragraph2 : expériences digitales / spécialisation (ex. gestion de campagnes, e-commerce, social media, outils tech) — intègre des métriques chiffrées si disponibles (+X% engagement, X produits lancés, communauté de X abonnés, etc.).
   - paragraph3 : expériences terrain / retail / activation (ex. relation client, gestion de rayon, animation commerciale) — intègre également des métriques si disponibles.
   - paragraph4 : conclusion personnalisée mentionnant un élément SPÉCIFIQUE à l'entreprise cible (positionnement, valeurs, campagne récente, produit phare), appel à l'action, puis terminer par la formule de politesse : "Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées."
4. Utilise "[CANDIDATE]" comme nom de famille si nécessaire — ne l'invente pas.
5. Ne génère JAMAIS de numéro de téléphone ni d'adresse email.
6. Laisse les champs phone et email vides ("").
7. Utilise l'entreprise et le poste de l'offre pour l'objet et l'argumentaire.
8. Si un champ "refinement" est fourni dans la requête, intègre ces éléments de motivation spécifiques dans la lettre de façon naturelle — sans les citer mot pour mot.
9. Maintiens un ton professionnel mais dynamique tout au long.

Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "candidate": {
    "firstName": "",
    "lastName": "[CANDIDATE]",
    "title": "",
    "phone": "",
    "email": "",
    "city": "",
    "linkedin": "",
    "github": ""
  },
  "company": {
    "name": "",
    "city": ""
  },
  "date": "",
  "object": "",
  "body": {
    "paragraph1": "",
    "paragraph2": "",
    "paragraph3": "",
    "paragraph4": ""
  },
  "signature": {
    "firstName": "",
    "lastName": "[CANDIDATE]"
  }
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
  skills?: { hard?: unknown; soft?: unknown; categories?: unknown };
  certifications?: unknown[];
  languages?: unknown[];
  projects?: unknown[];
};

type RawLetterJson = {
  body?: {
    paragraph1?: unknown;
    paragraph2?: unknown;
    paragraph3?: unknown;
    paragraph4?: unknown;
  };
  candidate?: {
    city?: unknown;
    email?: unknown;
    firstName?: unknown;
    github?: unknown;
    lastName?: unknown;
    linkedin?: unknown;
    phone?: unknown;
    title?: unknown;
  };
  company?: {
    city?: unknown;
    name?: unknown;
  };
  date?: unknown;
  object?: unknown;
  signature?: {
    firstName?: unknown;
    lastName?: unknown;
  };
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

function normalizeSkillCategories(raw: unknown): SkillCategory[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const categories = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const c = item as Record<string, unknown>;
      const label = toStr(c.label);
      const items = toStrArray(c.items);
      if (!label || items.length === 0) return null;
      return { label, items: items.slice(0, 10) };
    })
    .filter((c): c is SkillCategory => c !== null)
    .slice(0, 3);
  return categories.length > 0 ? categories : undefined;
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

function extractJsonFromContent<T>(raw: string): T {
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
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    throw new UnprocessableEntityException(
      "La génération IA a retourné un JSON invalide.",
    );
  }
}

function buildSkills(raw: RawCvJson["skills"]): CVDocumentContent["skills"] {
  const categories = normalizeSkillCategories(raw?.categories);
  const hard = categories
    ? categories.flatMap((c) => c.items)
    : toStrArray(raw?.hard);
  return { hard, soft: [], categories };
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
    skills: buildSkills(raw.skills),
  };
}

function normalizeUpdatedCvContent(
  value: CvContentUpdateRequest["cvContent"],
): CVDocumentContent {
  return {
    candidate: {
      city: toStr(value.candidate.city),
      email: toStr(value.candidate.email),
      firstName: toStr(value.candidate.firstName),
      github: toStr(value.candidate.github),
      lastName: toStr(value.candidate.lastName),
      linkedin: toStr(value.candidate.linkedin),
      phone: toStr(value.candidate.phone),
      summary: toStr(value.candidate.summary),
      title: toStr(value.candidate.title),
    },
    certifications: normalizeCertifications(
      Array.isArray(value.certifications) ? value.certifications : [],
    ),
    education: normalizeEducation(
      Array.isArray(value.education) ? value.education : [],
    ),
    experiences: normalizeExperiences(
      Array.isArray(value.experiences) ? value.experiences : [],
    ),
    languages: normalizeLanguages(
      Array.isArray(value.languages) ? value.languages : [],
    ),
    projects: normalizeProjects(
      Array.isArray(value.projects) ? value.projects : [],
    ),
    skills: {
      hard: Array.isArray(value.skills?.hard)
        ? toStrArray(value.skills.hard)
        : [],
      soft: Array.isArray(value.skills?.soft)
        ? toStrArray(value.skills.soft)
        : [],
    },
  };
}

function normalizeLetterJson(
  raw: RawLetterJson,
  localFields: LetterGenerationRequest["localFields"],
  fallbackCompanyName: string | null,
  fallbackCompanyCity: string | null,
  fallbackObject: string,
): LetterDocumentContent {
  const candidate = raw.candidate ?? {};
  const signature = raw.signature ?? {};

  const paragraph4 = toStr(raw.body?.paragraph4);

  return {
    body: {
      paragraph1: toStr(raw.body?.paragraph1),
      paragraph2: toStr(raw.body?.paragraph2),
      paragraph3: toStr(raw.body?.paragraph3),
      ...(paragraph4 ? { paragraph4 } : {}),
    },
    candidate: {
      city: toStr(candidate.city),
      email: localFields.email,
      firstName: toStr(candidate.firstName),
      github: toStr(candidate.github),
      lastName: localFields.lastName,
      linkedin: toStr(candidate.linkedin),
      phone: localFields.phone,
      title: toStr(candidate.title),
    },
    company: {
      city: toStr(raw.company?.city, fallbackCompanyCity ?? ""),
      name: toStr(raw.company?.name, fallbackCompanyName ?? ""),
    },
    date: toStr(raw.date, new Date().toISOString().slice(0, 10)),
    object: toStr(raw.object, fallbackObject),
    signature: {
      firstName: toStr(signature.firstName, toStr(candidate.firstName)),
      lastName: localFields.lastName,
    },
  };
}

function normalizeUpdatedLetterContent(
  value: LetterContentUpdateRequest["letterContent"],
): LetterDocumentContent {
  const paragraph4 = toStr(value.body.paragraph4);
  return {
    body: {
      paragraph1: toStr(value.body.paragraph1),
      paragraph2: toStr(value.body.paragraph2),
      paragraph3: toStr(value.body.paragraph3),
      ...(paragraph4 ? { paragraph4 } : {}),
    },
    candidate: {
      city: toStr(value.candidate.city),
      email: toStr(value.candidate.email),
      firstName: toStr(value.candidate.firstName),
      github: toStr(value.candidate.github),
      lastName: toStr(value.candidate.lastName),
      linkedin: toStr(value.candidate.linkedin),
      phone: toStr(value.candidate.phone),
      title: toStr(value.candidate.title),
    },
    company: {
      city: toStr(value.company.city),
      name: toStr(value.company.name),
    },
    date: toStr(value.date),
    object: toStr(value.object),
    signature: {
      firstName: toStr(value.signature.firstName),
      lastName: toStr(value.signature.lastName),
    },
  };
}

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
  return (versions?.reduce(
    (highest, version) => Math.max(highest, version.versionNumber),
    0,
  ) ?? 0) + 1;
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
      { temperature: 0.3 },
    );

    const rawJson = extractJsonFromContent<RawCvJson>(rawResponse);
    const cvContent = normalizeCvJson(rawJson, request.localFields);
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
    const letterTemplateId = this.resolveDefaultTemplateId(TEMPLATE_KIND_LETTER);

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
      application.cvTemplateId ?? this.resolveDefaultTemplateId(TEMPLATE_KIND_CV);

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
    const application = this.store.findByIdForUserEmail(userEmail, applicationId);

    if (!application) {
      throw new NotFoundException("La candidature est introuvable.");
    }

    return application;
  }

  private buildOfferContext(
    application: NonNullable<ReturnType<ApplicationsStore["findByIdForUserEmail"]>>,
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
      templates.find((template) => template.kind === kind && template.isDefault) ??
      templates.find((template) => template.kind === kind);

    return defaultTemplate?.id ?? null;
  }
}

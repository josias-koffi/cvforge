import type {
  CVDocumentContent,
  CvGenerationRequest,
  LetterDocumentContent,
} from "@cvforge/types";
import type { StoredApplication } from "../applications/applications.types";

export function makeStoredApplication(
  overrides: Partial<StoredApplication> = {},
): StoredApplication {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    cvContent: null,
    cvGeneratedAt: null,
    id: "app-001",
    letterContent: null,
    letterGeneratedAt: null,
    offerTextPreview: "A great job at Acme Corp.",
    offerUrl: "https://acme.example/jobs/1",
    rawOfferText:
      "We are hiring a senior TypeScript developer with 5 years of experience. Skills: TypeScript, Node.js, React. Responsibilities: Build APIs and UIs.",
    sourceLabel: "https://acme.example/jobs/1",
    sourceType: "url",
    status: "draft",
    statusHistory: [{ changedAt: "2026-01-01T00:00:00.000Z", status: "draft" }],
    updatedAt: "2026-01-01T00:00:00.000Z",
    userEmail: "user@test.example",
    extracted: {
      companyName: "Acme Corp",
      contractType: "CDI",
      language: "en",
      location: "Paris",
      requirements: ["TypeScript", "Node.js"],
      responsibilities: ["Build APIs"],
      salaryRange: null,
      summary: "Senior TypeScript developer",
      title: "Senior TypeScript Developer",
    },
    ...overrides,
  };
}

export function makeRequest(
  overrides: Partial<CvGenerationRequest> = {},
): CvGenerationRequest {
  return {
    localFields: {
      email: "user@test.example",
      lastName: "Dupont",
      phone: "+33612345678",
    },
    promptProfile: {
      headline: "Senior Developer",
      identity: {
        candidateToken: "[CANDIDATE]",
        city: "Paris",
        firstName: "Jean",
      },
      profileSections: {
        certifications: [],
        education: [
          {
            degree: "Master Informatique",
            honors: "",
            institution: "Sorbonne",
            year: "2018",
          },
        ],
        experiences: [
          {
            company: "Tech Corp",
            period: "2020-2023",
            results: "Delivered key APIs",
            role: "Backend Developer",
          },
        ],
        interests: "",
        personalProjects: [],
        softSkills: ["Communication"],
        summary: "Experienced backend developer",
        technicalSkills: ["TypeScript", "Node.js"],
      },
    },
    ...overrides,
  };
}

export const VALID_CV_JSON: CVDocumentContent = {
  candidate: {
    city: "Paris",
    email: "",
    firstName: "Jean",
    github: "",
    lastName: "[CANDIDATE]",
    linkedin: "",
    phone: "",
    summary: "Expert TypeScript developer with 5+ years.",
    title: "Senior TypeScript Developer",
  },
  certifications: [],
  education: [
    {
      description: "Specialized in distributed systems.",
      degree: "Master Informatique",
      institution: "Sorbonne",
      mention: "",
      year: "2018",
    },
  ],
  experiences: [
    {
      achievements: ["Delivered key APIs"],
      company: "Tech Corp",
      description: "Built backend systems",
      endDate: "2023",
      position: "Backend Developer",
      startDate: "2020",
    },
  ],
  languages: [],
  projects: [],
  interests: "Running, photography",
  skills: { hard: ["TypeScript", "Node.js"], soft: ["Communication"] },
};

export const VALID_LETTER_JSON: LetterDocumentContent = {
  body: {
    paragraph1: "I am applying for your senior TypeScript role.",
    paragraph2: "My backend and product experience align with your needs.",
    paragraph3: "I would welcome the opportunity to discuss this role.",
  },
  candidate: {
    city: "Paris",
    email: "",
    firstName: "Jean",
    github: "",
    lastName: "[CANDIDATE]",
    linkedin: "",
    phone: "",
    title: "Senior TypeScript Developer",
  },
  company: {
    city: "Paris",
    name: "Acme Corp",
  },
  date: "2026-04-20",
  object: "Application for Senior TypeScript Developer",
  signature: {
    firstName: "Jean",
    lastName: "[CANDIDATE]",
  },
};

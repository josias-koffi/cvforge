import { describe, expect, it, vi } from "vitest";
import { InterviewReportService } from "./interview-report.service";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { ApplicationsService } from "../applications/applications.service";
import type { CreditsService } from "../credits/credits.service";
import type { CompanyContextService } from "../applications/company-context.service";
import type { InterviewStore } from "./interview.types";
import { InterviewService } from "./interview.service";

function createStore(): InterviewStore {
  const sessions = new Map<
    string,
    Awaited<ReturnType<InterviewService["startSession"]>>["session"] & {
      userEmail: string;
    }
  >();

  return {
    findById: async (sessionId) => sessions.get(sessionId) ?? null,
    findByIdForUserEmail: async (userEmail, sessionId) => {
      const session = sessions.get(sessionId);
      if (!session || session.userEmail !== userEmail) {
        return null;
      }
      return session;
    },
    save: async (session) => {
      sessions.set(session.id, session);
      return session;
    },
    deleteByUserEmail: async () => 0,
    listByUserEmail: async () => [],
    purgeCompletedBefore: async () => 0,
  };
}

function createApplicationsService(): ApplicationsService {
  return {
    appendInterviewReport: vi.fn(),
    getOwnedApplication: vi.fn().mockResolvedValue({
      extracted: {
        companyName: "Acme",
        requirements: ["TypeScript", "ATS"],
        responsibilities: ["Analyser le poste"],
        summary: "Role ATS",
        title: "Product Engineer",
      },
      id: "app-001",
      interviewReports: [],
      rawOfferText: "Role ATS TypeScript",
      userEmail: "user@example.com",
    }),
  } as unknown as ApplicationsService;
}

function createCreditsService(): CreditsService {
  return {
    assertSufficientCredits: vi.fn().mockResolvedValue(undefined),
    consumeCredits: vi.fn().mockResolvedValue({}),
  } as unknown as CreditsService;
}

/** Derivation is a separate concern; here it is simply a no-op. */
function noCompanyContext(): CompanyContextService {
  return {
    ensureFor: vi.fn(async (application) => application),
  } as unknown as CompanyContextService;
}

function makeService(
  doubles: Record<string, unknown> = {},
  store: InterviewStore = createStore(),
  applications: ApplicationsService = createApplicationsService(),
  credits: CreditsService = createCreditsService(),
) {
  const chat = doubles;

  return new InterviewService(
    store,
    applications,
    noCompanyContext(),
    new InterviewReportService(chat as unknown as OpenRouterService),
    credits,
  );
}

/** Gives a session something to grade, the way a spoken turn would. */
async function seedTranscript(
  store: InterviewStore,
  sessionId: string,
  text: string,
) {
  const session = await store.findById(sessionId);
  if (!session) throw new Error(`no session ${sessionId}`);

  session.transcript = text;
  session.messages = [
    { content: text, role: "user", timestamp: "2026-04-24T13:00:10.000Z" },
  ];
  await store.save(session);
}

describe("InterviewService", () => {
  it("starts an empty interview session", async () => {
    const applicationsService = createApplicationsService();
    const service = makeService(
      { transcribe: vi.fn() },
      createStore(),
      applicationsService,
    );

    const result = await service.startSession("user@example.com");

    expect(result.sessionId).toContain("interview_");
    expect(result.session.status).toBe("idle");
    expect(result.session.chunks).toEqual([]);
    expect(result.session.language).toBe("fr");
    expect(result.session.profile).toBe("standard");
    expect(result.session.completedAt).toBeNull();
  });



  it("starts session with idle AI status", async () => {
    const applicationsService = createApplicationsService();
    const service = makeService(
      { transcribe: vi.fn() },
      createStore(),
      applicationsService,
    );

    const result = await service.startSession("user@example.com");

    expect(result.session.aiStatus).toBe("idle");
    expect(result.session.aiResponse).toBeNull();
    expect(result.session.aiResponseGeneratedAt).toBeNull();
  });

  it("stores the requested interview language on session start", async () => {
    const applicationsService = createApplicationsService();
    const service = makeService(
      { transcribe: vi.fn() },
      createStore(),
      applicationsService,
    );

    const result = await service.startSession("user@example.com", "en");

    expect(result.session.language).toBe("en");
  });

  it("stores the requested recruiter profile on session start", async () => {
    const applicationsService = createApplicationsService();
    const service = makeService(
      { transcribe: vi.fn() },
      createStore(),
      applicationsService,
    );

    const result = await service.startSession(
      "user@example.com",
      "fr",
      "technical",
    );

    expect(result.session.profile).toBe("technical");
  });


  it("marks a session completed when the user finishes cleanly", async () => {
    const applicationsService = createApplicationsService();
    const store = createStore();
    const service = makeService(
      {
        chat: vi.fn().mockResolvedValue(
          JSON.stringify({
            improvements: ["Raccourcir certaines reponses."],
            metrics: [
              {
                detail: "Clair.",
                key: "clarity",
                label: "Clarte des reponses",
                score: 8,
              },
              {
                detail: "Mots-cles presents.",
                key: "keywords",
                label: "Mots-cles metier mentionnes",
                score: 7,
              },
              {
                detail: "Rythme correct.",
                key: "pacing",
                label: "Duree moyenne de parole par reponse",
                score: 8,
              },
              {
                detail: "Peu d'hesitations.",
                key: "hesitations",
                label: "Hesitations detectees",
                score: 8,
              },
              {
                detail: "Bonne adequation au poste.",
                key: "relevance",
                label: "Pertinence par rapport a l'offre",
                score: 8,
              },
            ],
            overallScore: 8,
            summary: "Entretien solide.",
          }),
        ),
        transcribe: vi.fn().mockResolvedValue("Bonjour"),
      },
      store,
      applicationsService,
    );
    const { sessionId } = await service.startSession(
      "user@example.com",
      "fr",
      "passive",
      "app-001",
    );
    // The turn service is what fills a session now; seed the store directly
    // rather than reaching for the text pipeline this service no longer has.
    await seedTranscript(store, sessionId, "Bonjour");

    const completed = await service.finishSession("user@example.com", sessionId);

    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();
    expect(completed.recoverable).toBe(false);
    expect(completed.profile).toBe("passive");
    expect(completed.report?.overallScore).toBe(8);
  });




  it("stores the linked application on session start", async () => {
    const applicationsService = createApplicationsService();
    const service = makeService(
      { transcribe: vi.fn() },
      createStore(),
      applicationsService,
    );

    const result = await service.startSession(
      "user@example.com",
      "fr",
      "standard",
      "app-001",
    );

    expect(result.session.applicationId).toBe("app-001");
  });

  it("refuses to open a session against somebody else's application", async () => {
    // The ownership check used to go unawaited: the rejection escaped as an
    // unhandled promise and the session was created regardless.
    const applicationsService = {
      appendInterviewReport: vi.fn(),
      getOwnedApplication: vi
        .fn()
        .mockRejectedValue(new Error("Candidature introuvable.")),
    } as unknown as ApplicationsService;
    const store = createStore();
    const service = makeService({ transcribe: vi.fn() }, store, applicationsService);

    await expect(
      service.startSession("user@example.com", "fr", "standard", "app-999"),
    ).rejects.toThrow("Candidature introuvable.");

    expect(await store.findById("app-999")).toBeNull();
  });

  it("initialises session with an empty messages array", async () => {
    const service = makeService(
      { transcribe: vi.fn() },
      createStore(),
      createApplicationsService(),
    );

    const { session } = await service.startSession("user@example.com");

    expect(session.messages).toEqual([]);
  });




  it("freezes the offer onto the session, so the recruiter knows the job", () => {
    // The application used to be fetched only to check ownership and then
    // thrown away, which is why every interview was generic.
    const service = makeService();

    return service
      .startSession("user@example.com", "fr", "standard", "app-001")
      .then(({ session }) => {
        expect(session.context).toMatchObject({
          companyName: "Acme",
          offerTitle: "Product Engineer",
        });
      });
  });

  it("derives the company context once, before freezing it", async () => {
    const companyContext = {
      ensureFor: vi.fn(async (application: unknown) => ({
        ...(application as Record<string, unknown>),
        companyContext: {
          culture: "Remote-first",
          salaryEstimate: null,
          sector: "SaaS RH",
          size: null,
          values: ["Transparence"],
        },
      })),
    } as unknown as CompanyContextService;

    const service = new InterviewService(
      createStore(),
      createApplicationsService(),
      companyContext,
      new InterviewReportService({} as unknown as OpenRouterService),
      createCreditsService(),
    );

    const { session } = await service.startSession(
      "user@example.com",
      "fr",
      "standard",
      "app-001",
    );

    expect(companyContext.ensureFor).toHaveBeenCalledOnce();
    expect(session.context?.company).toMatchObject({ sector: "SaaS RH" });
  });

  it("stores the chosen duration, and falls back on a nonsense one", async () => {
    const service = makeService();

    const chosen = await service.startSession("a@example.com", "fr", "standard", "", 30);
    expect(chosen.session.durationMinutes).toBe(30);

    const nonsense = await service.startSession("b@example.com", "fr", "standard", "", 7);
    expect(nonsense.session.durationMinutes).toBe(10);
  });
});

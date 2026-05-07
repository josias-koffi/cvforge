import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { DraftApplication } from "@cvforge/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationsService } from "./applications.service";
import type {
  ApplicationsStore,
  StoredApplication,
} from "./applications.types";
import type { CreditsService } from "../credits/credits.service";

function createStore(): ApplicationsStore {
  const applications = new Map<string, StoredApplication>();

  return {
    createDraft(application) {
      applications.set(application.id, application);
      return application;
    },
    findById(applicationId) {
      return applications.get(applicationId) ?? null;
    },
    findByIdForUserEmail(userEmail, applicationId) {
      const application = applications.get(applicationId);

      if (!application || application.userEmail !== userEmail) {
        return null;
      }

      return application;
    },
    listByUserEmail(userEmail) {
      return [...applications.values()].filter(
        (application) => application.userEmail === userEmail,
      );
    },
    listAll() {
      return [...applications.values()];
    },
    save(application) {
      applications.set(application.id, application);
      return application;
    },
  };
}

describe("ApplicationsService", () => {
  const openRouterService = {
    chat: vi.fn(),
  };
  const creditsService = {
    consumeCredits: vi.fn(),
  } as unknown as CreditsService;

  beforeEach(() => {
    vi.restoreAllMocks();
    openRouterService.chat.mockReset();
    vi.mocked(creditsService.consumeCredits).mockReset();
  });

  it("imports a draft application from an offer url", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        `
          <html>
            <head>
              <title>Senior Platform Engineer</title>
              <meta property="og:site_name" content="Example Corp" />
              <meta name="description" content="Remote-first backend role." />
            </head>
            <body>
              <h1>Senior Platform Engineer</h1>
              <p>Responsibilities include building APIs, mentoring engineers, and improving reliability.</p>
              <p>Requirements include Node.js, TypeScript, and cloud infrastructure.</p>
            </body>
          </html>
        `,
        { status: 200 },
      ),
    );
    openRouterService.chat.mockResolvedValue(
      JSON.stringify({
        companyName: "Example Corp",
        contractType: "CDI",
        language: "en",
        location: "Remote",
        requirements: ["Node.js", "TypeScript"],
        responsibilities: ["Build APIs", "Mentor engineers"],
        salaryRange: "EUR 70k-90k",
        summary: "Remote-first backend role.",
        title: "Senior Platform Engineer",
      }),
    );
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    const application = await service.importFromUrl(
      "user@example.com",
      "https://example.com/jobs/123",
    );

    expect(application.userEmail).toBe("user@example.com");
    expect(application.status).toBe("draft");
    expect(application.statusHistory).toHaveLength(1);
    expect(application.sourceType).toBe("url");
    expect(application.extracted).toMatchObject({
      companyName: "Example Corp",
      contractType: "CDI",
      location: "Remote",
      title: "Senior Platform Engineer",
    });
    expect(openRouterService.chat).toHaveBeenCalledTimes(1);
    expect(creditsService.consumeCredits).toHaveBeenCalledWith({
      action: "offer_enrichment",
      userEmail: "user@example.com",
    });
  });

  it("imports a draft application from pasted offer text", async () => {
    openRouterService.chat.mockResolvedValue(
      JSON.stringify({
        companyName: "Example Corp",
        contractType: "CDI",
        language: "fr",
        location: "Paris",
        requirements: ["Node.js", "NestJS"],
        responsibilities: ["Concevoir des APIs", "Ameliorer la fiabilite"],
        salaryRange: null,
        summary: "Role backend senior axe plateforme.",
        title: "Senior Backend Engineer",
      }),
    );
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    const application = await service.importFromText(
      "user@example.com",
      `
        Senior Backend Engineer
        Nous recherchons une personne capable de concevoir des APIs, d'ameliorer
        la fiabilite de la plateforme, de collaborer avec l'equipe produit et
        d'accompagner les developpeurs sur NestJS, TypeScript et PostgreSQL dans
        un contexte de croissance.
      `,
    );

    expect(application.offerUrl).toBeNull();
    expect(application.sourceType).toBe("text");
    expect(application.sourceLabel).toBe("Texte colle manuellement");
    expect(application.extracted.title).toBe("Senior Backend Engineer");
    expect(application.statusHistory).toEqual([
      {
        changedAt: application.createdAt,
        status: "draft",
      },
    ]);
    expect(openRouterService.chat).toHaveBeenCalledTimes(1);
    expect(creditsService.consumeCredits).toHaveBeenCalledWith({
      action: "offer_enrichment",
      userEmail: "user@example.com",
    });
  });

  it("lists applications without exposing raw offer text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        "<html><head><title>Backend Engineer</title></head><body><p>Responsibilities and requirements with enough text to pass the threshold. Responsibilities and requirements with enough text to pass the threshold.</p></body></html>",
        { status: 200 },
      ),
    );
    openRouterService.chat.mockResolvedValue(
      JSON.stringify({
        language: "en",
        summary: "Backend role.",
        title: "Backend Engineer",
      }),
    );
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    await service.importFromUrl("user@example.com", "https://example.com/jobs/123");
    const applications = service.listApplications("user@example.com") as Array<
      DraftApplication & { rawOfferText?: string }
    >;

    expect(applications).toHaveLength(1);
    expect(applications[0]?.rawOfferText).toBeUndefined();
  });

  it("rejects invalid urls", async () => {
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    await expect(
      service.importFromUrl("user@example.com", "not-a-url"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("surfaces offer fetch failures cleanly", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    await expect(
      service.importFromUrl("user@example.com", "https://example.com/jobs/123"),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it("rejects scraping results that contain too little usable text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html><body><p>Too short</p></body></html>", { status: 200 }),
    );
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    await expect(
      service.importFromUrl("user@example.com", "https://example.com/jobs/123"),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("rejects pasted offer text that is empty", async () => {
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    await expect(
      service.importFromText("user@example.com", "   "),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("updates a draft application to sent when the transition is allowed", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        "<html><head><title>Backend Engineer</title></head><body><p>Responsibilities and requirements with enough text to pass the threshold. Responsibilities and requirements with enough text to pass the threshold.</p></body></html>",
        { status: 200 },
      ),
    );
    openRouterService.chat.mockResolvedValue(
      JSON.stringify({
        language: "en",
        summary: "Backend role.",
        title: "Backend Engineer",
      }),
    );
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    const application = await service.importFromUrl(
      "user@example.com",
      "https://example.com/jobs/123",
    );
    const updatedApplication = service.updateStatus(
      "user@example.com",
      application.id,
      "sent",
    );

    expect(updatedApplication.status).toBe("sent");
    expect(updatedApplication.statusHistory).toHaveLength(2);
    expect(updatedApplication.statusHistory[1]?.status).toBe("sent");
  });

  it("rejects forbidden backward transitions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        "<html><head><title>Backend Engineer</title></head><body><p>Responsibilities and requirements with enough text to pass the threshold. Responsibilities and requirements with enough text to pass the threshold.</p></body></html>",
        { status: 200 },
      ),
    );
    openRouterService.chat.mockResolvedValue(
      JSON.stringify({
        language: "en",
        summary: "Backend role.",
        title: "Backend Engineer",
      }),
    );
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    const application = await service.importFromUrl(
      "user@example.com",
      "https://example.com/jobs/123",
    );

    await expect(() =>
      service.updateStatus("user@example.com", application.id, "offer_received"),
    ).toThrow(ConflictException);
  });

  it("rejects unknown applications during a status change", () => {
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    expect(() =>
      service.updateStatus("user@example.com", "missing", "sent"),
    ).toThrow(NotFoundException);
  });

  it("builds a KPI summary from application statuses", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          "<html><head><title>Backend Engineer</title></head><body><p>Responsibilities and requirements with enough text to pass the threshold. Responsibilities and requirements with enough text to pass the threshold.</p></body></html>",
          { status: 200 },
        ),
      ),
    );
    openRouterService.chat.mockResolvedValue(
      JSON.stringify({
        language: "en",
        summary: "Backend role.",
        title: "Backend Engineer",
      }),
    );
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    const first = await service.importFromUrl(
      "user@example.com",
      "https://example.com/jobs/1",
    );
    const second = await service.importFromUrl(
      "user@example.com",
      "https://example.com/jobs/2",
    );
    const third = await service.importFromUrl(
      "user@example.com",
      "https://example.com/jobs/3",
    );

    service.updateStatus("user@example.com", first.id, "sent");
    service.updateStatus("user@example.com", first.id, "interview_scheduled");
    service.updateStatus("user@example.com", second.id, "sent");
    service.updateStatus("user@example.com", second.id, "rejected");

    const summary = service.listApplicationSummary("user@example.com");

    expect(summary).toEqual({
      respondedCount: 2,
      responseRate: 100,
      statusCounts: {
        draft: 1,
        interview_scheduled: 1,
        offer_received: 0,
        rejected: 1,
        sent: 0,
      },
      totalCount: 3,
    });
    expect(third.status).toBe("draft");
  });

  it("getApplicationForUser returns a DraftApplication for the owner", async () => {
    openRouterService.chat.mockResolvedValue(
      JSON.stringify({ title: "Engineer", companyName: "Acme", summary: "Build APIs", requirements: [], responsibilities: [] }),
    );
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    const offerText = "Software Engineer role at Acme Corp. "
      + "We are looking for a talented engineer with strong TypeScript skills. "
      + "Responsibilities include building APIs and mentoring junior developers. "
      + "Requirements include Node.js, TypeScript, PostgreSQL, and cloud infrastructure experience.";

    const created = await service.importFromText("user@example.com", offerText);
    const found = service.getApplicationForUser("user@example.com", created.id);

    expect(found.id).toBe(created.id);
    expect(found).not.toHaveProperty("rawOfferText");
    expect(found).not.toHaveProperty("cvContent");
  });

  it("getApplicationForUser throws NotFoundException for unknown id", () => {
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
      creditsService,
    );

    expect(() =>
      service.getApplicationForUser("user@example.com", "not-found"),
    ).toThrow(NotFoundException);
  });
});

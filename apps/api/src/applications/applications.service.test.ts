import {
  BadGatewayException,
  BadRequestException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { DraftApplication } from "@cvforge/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationsService } from "./applications.service";
import type {
  ApplicationsStore,
  StoredApplication,
} from "./applications.types";

function createStore(): ApplicationsStore {
  const applications = new Map<string, StoredApplication>();

  return {
    createDraft(application) {
      applications.set(application.id, application);
      return application;
    },
    listByUserEmail(userEmail) {
      return [...applications.values()].filter(
        (application) => application.userEmail === userEmail,
      );
    },
  };
}

describe("ApplicationsService", () => {
  const openRouterService = {
    chat: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    openRouterService.chat.mockReset();
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
    );

    const application = await service.importFromUrl(
      "user@example.com",
      "https://example.com/jobs/123",
    );

    expect(application.userEmail).toBe("user@example.com");
    expect(application.status).toBe("draft");
    expect(application.sourceType).toBe("url");
    expect(application.extracted).toMatchObject({
      companyName: "Example Corp",
      contractType: "CDI",
      location: "Remote",
      title: "Senior Platform Engineer",
    });
    expect(openRouterService.chat).toHaveBeenCalledTimes(1);
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
    expect(openRouterService.chat).toHaveBeenCalledTimes(1);
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
    );

    await expect(
      service.importFromUrl("user@example.com", "https://example.com/jobs/123"),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("rejects pasted offer text that is empty", async () => {
    const service = new ApplicationsService(
      createStore(),
      openRouterService as never,
    );

    await expect(
      service.importFromText("user@example.com", "   "),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

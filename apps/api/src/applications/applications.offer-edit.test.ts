import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreditsService } from "../credits/credits.service";
import { ApplicationsService } from "./applications.service";
import type {
  ApplicationsStore,
  StoredApplication,
} from "./applications.types";

const OFFER_TEXT =
  "Nous recherchons un developpeur backend TypeScript pour construire des API robustes, accompagner l'equipe produit et fiabiliser notre plateforme cloud au quotidien.";

function createStoredApplication(
  overrides: Partial<StoredApplication> = {},
): StoredApplication {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    cvContent: null,
    cvGeneratedAt: null,
    extracted: {
      companyName: "Example Corp",
      contractType: "CDI",
      language: "fr",
      location: "Paris",
      requirements: ["Node.js"],
      responsibilities: ["Build APIs"],
      salaryRange: null,
      summary: "Backend role",
      title: "Backend Engineer",
    },
    id: "app_1",
    letterContent: null,
    letterGeneratedAt: null,
    offerTextPreview: "Preview",
    offerUrl: "https://example.com/jobs/1",
    rawOfferText: OFFER_TEXT,
    sourceLabel: "https://example.com/jobs/1",
    sourceType: "url",
    status: "draft",
    statusHistory: [{ changedAt: "2026-04-20T12:00:00.000Z", status: "draft" }],
    updatedAt: "2026-04-20T12:00:00.000Z",
    userEmail: "user@example.com",
    ...overrides,
  };
}

function createStore(initial: StoredApplication[]): ApplicationsStore {
  const applications = new Map(initial.map((item) => [item.id, item]));

  return {
    deleteByUserEmail: (userEmail) => {
      const owned = [...applications.values()].filter(
        (application) => application.userEmail === userEmail,
      );

      owned.forEach(({ id }) => applications.delete(id));

      return owned.length;
    },
    createDraft: (application) => {
      applications.set(application.id, application);
      return application;
    },
    findById: (id) => applications.get(id) ?? null,
    findByIdForUserEmail: (userEmail, id) => {
      const application = applications.get(id);
      return application?.userEmail === userEmail ? application : null;
    },
    listAll: () => [...applications.values()],
    listByUserEmail: (userEmail) =>
      [...applications.values()].filter((item) => item.userEmail === userEmail),
    save: (application) => {
      applications.set(application.id, application);
      return application;
    },
  };
}

describe("ApplicationsService offer editing", () => {
  const openRouterService = { chat: vi.fn() };
  const creditsService = {
    consumeCredits: vi.fn(),
  } as unknown as CreditsService;
  let store: ApplicationsStore;
  let service: ApplicationsService;

  beforeEach(() => {
    vi.restoreAllMocks();
    openRouterService.chat.mockReset();
    vi.mocked(creditsService.consumeCredits).mockReset();
    store = createStore([createStoredApplication()]);
    service = new ApplicationsService(
      store,
      openRouterService as never,
      creditsService,
    );
  });

  it("returns the raw offer text alongside the application", () => {
    const result = service.getOfferForUser("user@example.com", "app_1");

    expect(result.offerText).toBe(OFFER_TEXT);
    expect(result.application).not.toHaveProperty("rawOfferText");
  });

  it("updates the description, source link and extracted fields", () => {
    const application = service.updateOffer("user@example.com", "app_1", {
      extracted: {
        companyName: "  ",
        requirements: ["TypeScript", " ", "NestJS"],
        title: "Lead Backend Engineer",
      },
      offerText: "  Nouveau descriptif complet  ",
      offerUrl: "https://jobs.example.org/42",
    });

    expect(application.extracted).toMatchObject({
      companyName: null,
      contractType: "CDI",
      requirements: ["TypeScript", "NestJS"],
      title: "Lead Backend Engineer",
    });
    expect(application.offerUrl).toBe("https://jobs.example.org/42");
    expect(application.sourceLabel).toBe("https://jobs.example.org/42");
    expect(application.offerTextPreview).toBe("Nouveau descriptif complet");
    expect(store.findById("app_1")?.rawOfferText).toBe(
      "Nouveau descriptif complet",
    );
  });

  it("switches the source to manual text when the link is cleared", () => {
    const application = service.updateOffer("user@example.com", "app_1", {
      offerUrl: "",
    });

    expect(application.offerUrl).toBeNull();
    expect(application.sourceType).toBe("text");
  });

  it("rejects an invalid link, an empty title or an empty description", () => {
    expect(() =>
      service.updateOffer("user@example.com", "app_1", { offerUrl: "ftp://x" }),
    ).toThrow(BadRequestException);
    expect(() =>
      service.updateOffer("user@example.com", "app_1", {
        extracted: { title: " " },
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      service.updateOffer("user@example.com", "app_1", { offerText: "" }),
    ).toThrow(BadRequestException);
  });

  it("refuses to edit an offer owned by someone else", () => {
    expect(() =>
      service.updateOffer("other@example.com", "app_1", { offerText: "x" }),
    ).toThrow(NotFoundException);
  });

  it("re-extracts structured fields from the stored description", async () => {
    openRouterService.chat.mockResolvedValue(
      JSON.stringify({ summary: "Nouveau resume", title: "Staff Engineer" }),
    );

    const application = await service.reExtractOffer(
      "user@example.com",
      "app_1",
      "text",
    );

    expect(application.extracted.title).toBe("Staff Engineer");
    expect(application.offerUrl).toBe("https://example.com/jobs/1");
    expect(application.sourceType).toBe("url");
    expect(creditsService.consumeCredits).toHaveBeenCalledTimes(1);
  });

  it("rejects url re-extraction without a link and unknown sources", async () => {
    store.save(createStoredApplication({ offerUrl: null, sourceType: "text" }));

    await expect(
      service.reExtractOffer("user@example.com", "app_1", "url"),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.reExtractOffer("user@example.com", "app_1", "pdf"),
    ).rejects.toThrow(BadRequestException);
  });

  it("remembers the profile picked for an application", async () => {
    const withProfiles = new ApplicationsService(
      store,
      openRouterService as never,
      creditsService,
      () => Promise.resolve(["profile_a", "profile_b"]),
    );

    const application = await withProfiles.setProfile(
      "user@example.com",
      "app_1",
      " profile_b ",
    );

    expect(application.profileId).toBe("profile_b");
    expect(application.updatedAt).toBe("2026-04-20T12:00:00.000Z");
    const reset = await withProfiles.setProfile("user@example.com", "app_1", null);
    expect(reset.profileId).toBeNull();
  });

  it("rejects an unknown or missing profile", async () => {
    const withProfiles = new ApplicationsService(
      store,
      openRouterService as never,
      creditsService,
      () => Promise.resolve(["profile_a"]),
    );

    await expect(
      withProfiles.setProfile("user@example.com", "app_1", "ghost"),
    ).rejects.toThrow(NotFoundException);
    await expect(
      withProfiles.setProfile("user@example.com", "app_1", ""),
    ).rejects.toThrow(BadRequestException);
    await expect(
      withProfiles.setProfile("other@example.com", "app_1", "profile_a"),
    ).rejects.toThrow(NotFoundException);
  });
});

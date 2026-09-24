import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "../auth/auth.service";
import { createInMemoryAccountStore } from "../auth/testing/in-memory-account-store";
import type { CreditsService } from "../credits/credits.service";
import { PublicKeywordMatchController } from "../keyword-match/keyword-match.controller";
import type { KeywordMatchService } from "../keyword-match/keyword-match.service";
import { LeadCaptureService } from "../leads/lead-capture.service";
import { ApplicationsService } from "./applications.service";
import {
  LEAD_INTERVIEW_SOURCE_LABEL,
  LEAD_OFFER_SOURCE_LABEL,
  type ApplicationsStore,
  type StoredApplication,
} from "./applications.types";
import { LeadOfferListener } from "./lead-offer.listener";

const OFFER = [
  "Développeuse TypeScript — Acme",
  "Nous recherchons une développeuse TypeScript pour construire nos API Node.js.",
  "Vous maîtrisez PostgreSQL, Docker et les tests automatisés.",
  "Poste basé à Lyon, deux jours de télétravail par semaine.",
].join("\n");

function createStore() {
  const rows: StoredApplication[] = [];
  const store = {
    createDraft: vi.fn(async (application: StoredApplication) => {
      rows.push(application);
      return application;
    }),
  } as unknown as ApplicationsStore;

  return { rows, store };
}

/**
 * The application a comparator lead signed up for (US-136): created on the
 * house, whatever the model does.
 */
describe("ApplicationsService.importOfferedText", () => {
  const chat = vi.fn();
  const credits = {
    assertSufficientCredits: vi.fn(),
    consumeCredits: vi.fn(),
  };
  let rows: StoredApplication[];
  let service: ApplicationsService;

  beforeEach(() => {
    chat.mockReset();
    credits.assertSufficientCredits.mockReset();
    credits.consumeCredits.mockReset();
    const created = createStore();
    rows = created.rows;
    service = new ApplicationsService(
      created.store,
      { chat } as never,
      credits as unknown as CreditsService,
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("creates the application with the offer's text and spends no credit", async () => {
    chat.mockResolvedValue(
      JSON.stringify({
        summary: "API Node.js",
        title: "Développeuse TypeScript",
      }),
    );

    const draft = await service.importOfferedText("lead@example.com", OFFER);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rawOfferText: OFFER,
      sourceLabel: LEAD_OFFER_SOURCE_LABEL,
      sourceType: "text",
      userEmail: "lead@example.com",
    });
    expect(draft.extracted.title).toBe("Développeuse TypeScript");
    expect(credits.assertSufficientCredits).not.toHaveBeenCalled();
    expect(credits.consumeCredits).not.toHaveBeenCalled();
  });

  it("still creates it from the text alone when the model fails", async () => {
    chat.mockRejectedValue(new Error("provider down"));

    const draft = await service.importOfferedText("lead@example.com", OFFER);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.rawOfferText).toBe(OFFER);
    expect(draft.extracted.title).toBe("Développeuse TypeScript — Acme");
    expect(draft.extracted.summary).toContain("Nous recherchons");
    expect(credits.consumeCredits).not.toHaveBeenCalled();
  });
});

describe("LeadOfferListener", () => {
  function listen() {
    let listener:
      | ((email: string, intent: unknown) => Promise<unknown>)
      | null = null;
    const auth = {
      onLeadIntent: (callback: typeof listener) => {
        listener = callback;
      },
    } as unknown as AuthService;
    const applications = { importOfferedText: vi.fn() };

    new LeadOfferListener(
      auth,
      applications as unknown as ApplicationsService,
    ).onModuleInit();

    return { applications, redeem: listener! };
  }

  it("opens the offered application when a comparator link is redeemed", async () => {
    const { applications, redeem } = listen();

    await redeem("lead@example.com", { kind: "offer", offerText: OFFER });

    expect(applications.importOfferedText).toHaveBeenCalledWith(
      "lead@example.com",
      OFFER,
      LEAD_OFFER_SOURCE_LABEL,
    );
  });

  it("labels the application with the interview questions tool (US-141)", async () => {
    const { applications, redeem } = listen();

    await redeem("lead@example.com", { kind: "interview", offerText: OFFER });

    expect(applications.importOfferedText).toHaveBeenCalledWith(
      "lead@example.com",
      OFFER,
      LEAD_INTERVIEW_SOURCE_LABEL,
    );
  });

  it("leaves the other tools' intents alone", async () => {
    const { applications, redeem } = listen();

    await redeem("lead@example.com", {
      kind: "ats_scan",
      scanId: "11111111-1111-4111-8111-111111111111",
    });

    expect(applications.importOfferedText).not.toHaveBeenCalled();
  });
});

/**
 * The whole way from the comparator's "Generate a CV for this offer" to the
 * application, with the real classes: the lead route, the magic link, its
 * redemption and the listener (US-136).
 */
describe("comparator lead → application, end to end", () => {
  it("creates the application with the offer once the link is redeemed, spending no credit", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T12:00:00.000Z"));

    const auth = new AuthService(
      {
        apiUrl: "http://localhost:3333",
        appUrl: "http://localhost:3000",
        cookieDomain: undefined,
        cookieName: "cvforge_session",
        magicLinkTtlMinutes: 15,
        secureCookies: false,
        sessionSecret: "test-secret",
        sessionTtlDays: 7,
      },
      createInMemoryAccountStore(),
    );
    const sent: string[] = [];
    const controller = new PublicKeywordMatchController(
      {} as KeywordMatchService,
      new LeadCaptureService(auth, {
        sendMagicLinkEmail: async ({ magicLink }: { magicLink: string }) => {
          sent.push(magicLink);
        },
      } as never),
    );
    const { rows, store } = createStore();
    const credits = {
      assertSufficientCredits: vi.fn(),
      consumeCredits: vi.fn(),
    };
    const chat = vi
      .fn()
      .mockResolvedValue(JSON.stringify({ summary: "API", title: "Dev TS" }));
    const applications = new ApplicationsService(
      store,
      { chat } as never,
      credits as unknown as CreditsService,
    );
    new LeadOfferListener(auth, applications).onModuleInit();

    await controller.lead({
      consentAccepted: true,
      email: "lead@example.com",
      offerText: OFFER,
    });

    expect(sent).toHaveLength(1);
    const link = new URL(sent[0]!);
    const next = new URL(link.searchParams.get("redirectTo")!).searchParams.get(
      "next",
    );
    expect(next).toBe("/candidatures");
    expect(rows).toHaveLength(0);

    await auth.consumeMagicLink(link.searchParams.get("token")!);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rawOfferText: OFFER,
      sourceLabel: LEAD_OFFER_SOURCE_LABEL,
      userEmail: "lead@example.com",
    });
    expect(credits.assertSufficientCredits).not.toHaveBeenCalled();
    expect(credits.consumeCredits).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

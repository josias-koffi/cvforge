import { describe, expect, it, vi } from "vitest";
import type { OpenRouterService } from "../ai/openrouter.service";
import type { ApplicationsStore, StoredApplication } from "./applications.types";
import {
  CompanyContextService,
  normalizeCompanyContext,
} from "./company-context.service";

const DERIVED = {
  culture: "Remote-first, revues de code systematiques",
  salaryEstimate: "55-65k",
  sector: "SaaS RH",
  size: "50-200",
  values: ["Transparence", "Autonomie"],
};

function makeApplication(
  overrides: Partial<StoredApplication> = {},
): StoredApplication {
  return {
    extracted: { companyName: "Acme" },
    id: "app-1",
    rawOfferText: "Acme, editeur SaaS RH, equipe remote-first de 80 personnes.",
    ...overrides,
  } as unknown as StoredApplication;
}

function setup(chat: unknown) {
  const saved: StoredApplication[] = [];
  const store = {
    save: vi.fn(async (application: StoredApplication) => {
      saved.push(application);
      return application;
    }),
  } as unknown as ApplicationsStore;

  return {
    saved,
    service: new CompanyContextService(
      { chat } as unknown as OpenRouterService,
      store,
    ),
    store,
  };
}

const answering = (payload: unknown) =>
  vi.fn().mockResolvedValue(JSON.stringify(payload));

describe("CompanyContextService.derive", () => {
  it("reads the company out of its own offer", () => {
    const { service } = setup(answering(DERIVED));

    return expect(
      service.derive({ companyName: "Acme", offerText: "Acme, SaaS RH." }),
    ).resolves.toEqual(DERIVED);
  });

  it("asks for grounded fields only, never invention", async () => {
    const chat = answering(DERIVED);
    const { service } = setup(chat);

    await service.derive({ companyName: "Acme", offerText: "Acme, SaaS RH." });

    const [messages] = chat.mock.calls[0] as [Array<{ content: string }>];
    expect(messages[0]!.content).toContain("never invent");
  });

  it("does not call the model without an offer to read", async () => {
    const chat = answering(DERIVED);
    const { service } = setup(chat);

    await expect(
      service.derive({ companyName: "Acme", offerText: "   " }),
    ).resolves.toBeNull();
    expect(chat).not.toHaveBeenCalled();
  });

  it("caps the offer it sends: the company is described up front", async () => {
    const chat = answering(DERIVED);
    const { service } = setup(chat);

    await service.derive({ companyName: null, offerText: "a".repeat(20_000) });

    const [messages] = chat.mock.calls[0] as [Array<{ content: string }>];
    expect(messages[1]!.content.length).toBeLessThan(6_500);
  });

  it("returns null rather than failing a session the candidate paid for", async () => {
    const { service } = setup(vi.fn().mockRejectedValue(new Error("modele KO")));

    await expect(
      service.derive({ companyName: "Acme", offerText: "Acme." }),
    ).resolves.toBeNull();
  });

  it("survives a model that answered with prose instead of JSON", async () => {
    const { service } = setup(vi.fn().mockResolvedValue("Voici l'entreprise…"));

    await expect(
      service.derive({ companyName: "Acme", offerText: "Acme." }),
    ).resolves.toBeNull();
  });
});

describe("CompanyContextService.ensureFor", () => {
  it("derives once and caches it on the application", async () => {
    const { saved, service } = setup(answering(DERIVED));

    const updated = await service.ensureFor(makeApplication());

    expect(updated.companyContext).toEqual(DERIVED);
    expect(updated.companyContextGeneratedAt).toBeTruthy();
    expect(saved).toHaveLength(1);
  });

  it("never asks twice for the same application", async () => {
    const chat = answering(DERIVED);
    const { saved, service } = setup(chat);

    const cached = makeApplication({ companyContext: DERIVED });
    await expect(service.ensureFor(cached)).resolves.toBe(cached);
    expect(chat).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  });

  it("leaves the application alone when nothing could be derived", async () => {
    // Writing an empty context would only make us look it up again forever.
    const { saved, service } = setup(vi.fn().mockRejectedValue(new Error("KO")));
    const application = makeApplication();

    await expect(service.ensureFor(application)).resolves.toBe(application);
    expect(saved).toHaveLength(0);
  });
});

describe("normalizeCompanyContext", () => {
  it("keeps a well-formed answer", () => {
    expect(normalizeCompanyContext(DERIVED)).toEqual(DERIVED);
  });

  it("turns the string 'null' into an actual null", () => {
    // Models write it out surprisingly often, and it reads as a fact.
    expect(
      normalizeCompanyContext({ ...DERIVED, culture: "null" })?.culture,
    ).toBeNull();
  });

  it("drops non-string values rather than passing them to a prompt", () => {
    expect(
      normalizeCompanyContext({ ...DERIVED, values: ["ok", 42, null] })?.values,
    ).toEqual(["ok"]);
  });

  it("caps the values list", () => {
    expect(
      normalizeCompanyContext({
        ...DERIVED,
        values: Array.from({ length: 20 }, (_, i) => `v${i}`),
      })?.values,
    ).toHaveLength(6);
  });

  it("is null when the offer said nothing about the company", () => {
    expect(
      normalizeCompanyContext({
        culture: null,
        salaryEstimate: null,
        sector: null,
        size: null,
        values: [],
      }),
    ).toBeNull();
  });

  it("is null on anything that is not an object", () => {
    expect(normalizeCompanyContext("nope")).toBeNull();
    expect(normalizeCompanyContext(null)).toBeNull();
  });

  it("keeps a partial answer: one grounded field is worth having", () => {
    expect(
      normalizeCompanyContext({
        culture: null,
        salaryEstimate: null,
        sector: "SaaS RH",
        size: null,
        values: [],
      }),
    ).toMatchObject({ sector: "SaaS RH" });
  });
});

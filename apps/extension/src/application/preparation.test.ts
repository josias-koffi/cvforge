import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationSummary } from "../domain/offer";
import { Preparation, type ActiveTab, type PageReader } from "./preparation";
import { ConnectionRevokedError } from "./session";

const URL_ = "https://jobs.example.com/offre/42";
const TAB: ActiveTab = { tabId: 7, title: "Dev — Acme", url: URL_ };
const PAGE_TEXT = "Développeur web chez Acme. ".repeat(10);

function setup(applications: ApplicationSummary[] = []) {
  let tab: ActiveTab | null | "no-access" = TAB;
  const pages: PageReader = {
    activeTab: async () => tab,
    readText: vi.fn(async () => PAGE_TEXT),
  };
  const call = vi.fn(async (name: string) => {
    switch (name) {
      case "list_applications":
        return applications;
      case "get_credit_balance":
        return { balance: 20 };
      case "import_offer":
        return {
          applicationId: "new-1",
          balanceAfter: 19,
          company: "Acme",
          creditsSpent: 1,
          title: "Dev",
        };
      case "generate_cv":
        return { balanceAfter: 16, creditsSpent: 3 };
      case "generate_cover_letter":
        return { balanceAfter: 13, creditsSpent: 3 };
    }
    throw new Error(`unexpected ${name}`);
  });
  const preparation = new Preparation({ pages, tools: { call } });
  return {
    call,
    pages,
    preparation,
    setTab: (next: typeof tab) => {
      tab = next;
    },
  };
}

const draft = (over: Partial<ApplicationSummary> = {}): ApplicationSummary => ({
  company: "Acme",
  cvGeneratedAt: null,
  id: "a1",
  letterGeneratedAt: null,
  offerUrl: `${URL_}?utm_source=newsletter`,
  status: "draft",
  title: "Dev",
  ...over,
});

describe("Preparation.inspect", () => {
  it("asks for access before reading any page", async () => {
    const f = setup();
    f.setTab("no-access");
    expect(await f.preparation.inspect()).toEqual({ kind: "no-access" });
    expect(f.call).not.toHaveBeenCalled();
  });

  it("says when the tab is not a web page", async () => {
    const f = setup();
    f.setTab(null);
    expect(await f.preparation.inspect()).toEqual({ kind: "no-page" });
  });

  it("announces the full cost for a new offer, with the balance", async () => {
    const inspection = await setup().preparation.inspect();
    expect(inspection).toMatchObject({
      balance: 20,
      existing: null,
      kind: "page",
      page: { host: "jobs.example.com", title: "Dev — Acme", url: URL_ },
      plan: { cost: 7, steps: ["import", "cv", "letter"] },
    });
  });

  it("recognises an application already sent for this offer", async () => {
    const inspection = await setup([
      draft({ status: "sent" }),
    ]).preparation.inspect();
    expect(inspection).toMatchObject({ plan: { alreadySent: true, cost: 0 } });
  });
});

describe("Preparation.prepare", () => {
  let f: ReturnType<typeof setup>;
  beforeEach(() => {
    f = setup();
  });

  it("imports the page text with its address, then the CV and the letter", async () => {
    const result = await f.preparation.prepare({ cost: 7, url: URL_ });

    expect(f.call).toHaveBeenCalledWith("import_offer", {
      offerText: PAGE_TEXT.trim(),
      url: URL_,
    });
    expect(f.call).toHaveBeenCalledWith("generate_cv", {
      applicationId: "new-1",
    });
    expect(f.call).toHaveBeenCalledWith("generate_cover_letter", {
      applicationId: "new-1",
    });
    expect(result).toEqual({
      applicationId: "new-1",
      balanceAfter: 13,
      company: "Acme",
      creditsSpent: 7,
      title: "Dev",
    });
  });

  it("lets the server read the address when the page text is too thin", async () => {
    vi.mocked(f.pages.readText).mockResolvedValueOnce("Chargement…");
    await f.preparation.prepare({ cost: 7, url: URL_ });
    expect(f.call).toHaveBeenCalledWith("import_offer", { url: URL_ });
  });

  it("completes an existing draft without importing the offer again", async () => {
    const g = setup([draft({ cvGeneratedAt: "2026-11-26" })]);
    const result = await g.preparation.prepare({ cost: 3, url: URL_ });

    const names = g.call.mock.calls.map(([name]) => name);
    expect(names).not.toContain("import_offer");
    expect(names).not.toContain("generate_cv");
    expect(names).toContain("generate_cover_letter");
    expect(result).toMatchObject({ applicationId: "a1", creditsSpent: 3 });
  });

  it("spends nothing when the cost grew after the announcement", async () => {
    await expect(f.preparation.prepare({ cost: 3, url: URL_ })).rejects.toThrow(
      "coût a changé",
    );
    expect(f.call).not.toHaveBeenCalledWith("import_offer", expect.anything());
  });

  it("spends nothing when the tab changed since the announcement", async () => {
    await expect(
      f.preparation.prepare({ cost: 7, url: "https://other.example/job" }),
    ).rejects.toThrow("onglet a changé");
    expect(f.call).not.toHaveBeenCalled();
  });

  it("never prepares an application already sent", async () => {
    const g = setup([draft({ status: "sent" })]);
    await expect(g.preparation.prepare({ cost: 7, url: URL_ })).rejects.toThrow(
      "déjà envoyée",
    );
  });

  it("explains an offer JobSpark could not read", async () => {
    f.call.mockImplementation(async (name: string) => {
      if (name === "list_applications") return [];
      throw new Error("Page introuvable");
    });
    await expect(f.preparation.prepare({ cost: 7, url: URL_ })).rejects.toThrow(
      "n'a pas pu lire cette offre : Page introuvable",
    );
  });

  it("lets a revoked connection surface as such", async () => {
    f.call.mockImplementation(async (name: string) => {
      if (name === "list_applications") return [];
      throw new ConnectionRevokedError("revoked");
    });
    await expect(
      f.preparation.prepare({ cost: 7, url: URL_ }),
    ).rejects.toBeInstanceOf(ConnectionRevokedError);
  });
});

describe("Preparation.prepareTab (queue, US-204)", () => {
  it("works on a background tab, within the queue's budget", async () => {
    const f = setup();
    f.setTab(null); // the candidate looks at another page
    const result = await f.preparation.prepareTab(TAB, { maxCost: 7 });
    expect(result).toMatchObject({ applicationId: "new-1", creditsSpent: 7 });
  });

  it("spends nothing when the plan exceeds the budget, and says how much", async () => {
    const f = setup();
    await expect(
      f.preparation.prepareTab(TAB, { maxCost: 6 }),
    ).rejects.toMatchObject({ cost: 7 });
    expect(f.call).toHaveBeenCalledTimes(1); // list_applications only
  });

  it("uses the application JobSpark already has, even at another address", async () => {
    const f = setup([
      draft({
        cvGeneratedAt: "x",
        id: "known",
        offerUrl: "https://www.francetravail.fr/offre/1",
      }),
    ]);
    const result = await f.preparation.prepareTab(TAB, {
      applicationId: "known",
      maxCost: 7,
    });
    expect(result).toMatchObject({ applicationId: "known", creditsSpent: 3 });
    expect(f.call).not.toHaveBeenCalledWith("import_offer", expect.anything());
  });
});

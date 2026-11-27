import { describe, expect, it, vi } from "vitest";
import type { Queue, QueueOffer } from "../domain/queue";
import type { KeyValueStore } from "../infrastructure/local-store";
import type { FillOutcome } from "./filling";
import { CostChangedError, type ActiveTab } from "./preparation";
import { mergeOffers } from "../domain/queue";
import { ApplicationQueue, type QueueTabs } from "./queue";
import type { Review } from "./sending";
import { ConnectionRevokedError } from "./session";

const offer = (key: string, url = `https://jobs.lever.co/acme/${key}`) =>
  ({
    company: "Acme",
    key,
    source: "jobspark",
    title: key,
    url,
  }) satisfies QueueOffer;

const FILLED: FillOutcome = {
  aiUsed: true,
  answersSaved: 0,
  creditsSpent: 2,
  drafted: [],
  formUrl: null,
  optionalEmpty: [],
  prefilled: [],
  questionsAsked: 0,
  success: true,
  summary: "",
};

const review = (refusal: string | null = null, captcha = false): Review => ({
  application: { company: "Acme", id: "app", offerUrl: null, title: "Dev" },
  captcha,
  documents: ["CV.pdf"],
  drafted: [],
  fields: [
    { label: "Email", value: "c@example.com" },
    { label: "Name", value: "Camille" },
  ],
  kind: "review",
  refusal,
  requiredEmpty: [],
  submitLabel: "Submit application",
  url: "https://jobs.lever.co/acme/1/apply",
});

function memoryStore(): KeyValueStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async <T>(key: string) =>
      structuredClone(data.get(key)) as T | undefined,
    remove: async (...keys) => {
      for (const key of keys) data.delete(key);
    },
    set: async (key, value) => {
      data.set(key, structuredClone(value));
    },
  };
}

function setup(
  options: {
    balance?: number;
    personalKey?: boolean;
    reachable?: (tabId: number) => boolean;
    daily?: unknown;
    prepare?: (tab: ActiveTab, maxCost: number) => Promise<number>;
    store?: ReturnType<typeof memoryStore>;
  } = {},
) {
  let nextTab = 100;
  const opened = new Map<number, ActiveTab>();
  const tabs: QueueTabs = {
    close: vi.fn(async (tabId: number) => {
      opened.delete(tabId);
    }),
    current: vi.fn(async (tabId: number) => opened.get(tabId) ?? null),
    focus: vi.fn(async () => undefined),
    open: vi.fn(async (url: string) => {
      const tab = { tabId: nextTab++, title: "Offre", url };
      opened.set(tab.tabId, tab);
      return tab;
    }),
    openOffers: vi.fn(async () => []),
  };
  const call = vi.fn(async (name: string) => {
    if (name === "get_credit_balance")
      return { balance: options.balance ?? 50 };
    if (name === "list_recent_offers") return [];
    if (name === "get_daily_offers") {
      if (options.daily instanceof Error) throw options.daily;
      return options.daily ?? { digestDate: "2026-11-27", matches: [] };
    }
    throw new Error(`unexpected ${name}`);
  });
  const prepareTab = vi.fn(
    async (tab: ActiveTab, limits: { maxCost: number }) => {
      const cost = options.prepare
        ? await options.prepare(tab, limits.maxCost)
        : 7;
      if (cost > limits.maxCost) throw new CostChangedError(cost);
      return {
        applicationId: `app-${tab.tabId}`,
        balanceAfter: null,
        company: "Acme",
        creditsSpent: cost,
        title: "Dev",
      };
    },
  );
  const filling = {
    fillTab: vi.fn(async () => ({
      ...FILLED,
      creditsSpent: options.personalKey ? 0 : 2,
    })),
    formReachable: vi.fn(
      async (tabId: number) => options.reachable?.(tabId) ?? true,
    ),
    keepIdentity: vi.fn(async () => undefined),
    profileGaps: vi.fn(async () => []),
  };
  const sending = {
    reviewTab: vi.fn(async () => review()),
    send: vi.fn(async () => ({
      confirmationUrl: "https://jobs.lever.co/acme/1/thanks",
      confirmed: true,
      recorded: true,
    })),
  };
  const release = vi.fn();
  const notify = vi.fn(async () => undefined);
  const store = options.store ?? memoryStore();
  const queue = new ApplicationQueue({
    aiKeys: {
      clear: async () => undefined,
      get: async () =>
        options.personalKey
          ? { apiKey: "k", baseURL: "https://x", model: "m" }
          : null,
      save: async () => undefined,
    },
    canReadPages: async () => true,
    filling,
    keepAlive: () => release,
    newId: () => "q1",
    notify,
    preparation: { prepareTab },
    sending,
    store,
    tabs,
    tools: { call },
  });
  /** Waits for the background run to finish. */
  const settle = async () => {
    for (let i = 0; i < 50; i++) {
      const status = await queue.status();
      if (!status?.running) return status!;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    throw new Error("the queue never finished");
  };
  return {
    filling,
    notify,
    prepareTab,
    queue,
    release,
    sending,
    settle,
    store,
    tabs,
  };
}

describe("ApplicationQueue: the run (US-204)", () => {
  it("prepares and fills each offer in its own background tab, unattended", async () => {
    const f = setup();
    await f.queue.start({ budget: 18, offers: [offer("1"), offer("2")] });
    const done = await f.settle();

    expect(done.items.map((item) => item.state)).toEqual(["ready", "ready"]);
    expect(done.spent).toBe(18);
    expect(done.items[0]).toMatchObject({
      applicationId: "app-100",
      creditsSpent: 9,
      filledCount: 2,
      tabId: 100,
    });
    expect(f.filling.fillTab).toHaveBeenCalledWith(
      expect.objectContaining({ tabId: 100 }),
      { applicationId: "app-100" },
      { unattended: true },
    );
    expect(f.sending.send).not.toHaveBeenCalled(); // never sends by itself
    expect(f.release).toHaveBeenCalled();
  });

  it("leaves out blocked sites and pages without a form, spending nothing", async () => {
    const f = setup({ reachable: (tabId) => tabId !== 100 });
    await f.queue.start({
      budget: 50,
      offers: [
        offer("nofrm"),
        offer("li", "https://www.linkedin.com/jobs/view/1"),
      ],
    });
    const done = await f.settle();
    expect(done.items.map((item) => [item.state, item.reason])).toEqual([
      ["skipped", "Aucun formulaire de candidature sur la page."],
      ["skipped", "LinkedIn interdit l'envoi automatique."],
    ]);
    expect(done.spent).toBe(0);
    expect(f.prepareTab).not.toHaveBeenCalled();
    expect(f.tabs.open).toHaveBeenCalledTimes(1); // LinkedIn never opened
    expect(f.tabs.close).toHaveBeenCalledWith(100); // the useless tab closed
    expect(done.items[0]!.tabId).toBeNull();
  });

  it("never spends past the budget", async () => {
    const f = setup();
    await f.queue.start({
      budget: 12,
      offers: [offer("1"), offer("2"), offer("3")],
    });
    const done = await f.settle();
    expect(done.items.map((item) => item.state)).toEqual([
      "ready",
      "skipped",
      "skipped",
    ]);
    for (const item of done.items.slice(1)) {
      expect(item.reason).toBe("Budget atteint : il faudrait 7 crédits.");
    }
    expect(done.spent).toBe(9);
  });

  it("goes on after an offer fails, and stops on a revoked connection", async () => {
    let calls = 0;
    const f = setup({
      prepare: async () => {
        calls += 1;
        if (calls === 1)
          throw new Error("JobSpark n'a pas pu lire cette offre");
        if (calls === 2) throw new ConnectionRevokedError();
        return 7;
      },
    });
    await f.queue.start({
      budget: 50,
      offers: [offer("1"), offer("2"), offer("3")],
    });
    const done = await f.settle();
    expect(done.items.map((item) => item.state)).toEqual([
      "failed",
      "failed",
      "skipped",
    ]);
    expect(done.items[2]!.reason).toBe("File arrêtée.");
  });

  it("marks a form left with a refusal as to complete", async () => {
    const f = setup();
    f.sending.reviewTab.mockResolvedValueOnce(
      review("Champs obligatoires encore vides : Pronouns."),
    );
    await f.queue.start({ budget: 9, offers: [offer("1")] });
    const done = await f.settle();
    expect(done.items[0]).toMatchObject({
      reason: "Champs obligatoires encore vides : Pronouns.",
      state: "incomplete",
    });
  });

  it("flags a captcha left for the candidate, and reports the end (US-209)", async () => {
    const f = setup();
    f.sending.reviewTab.mockResolvedValueOnce(review(null, true));
    await f.queue.start({ budget: 18, offers: [offer("1"), offer("2")] });
    const done = await f.settle();
    expect(done.items.map((item) => [item.state, item.reason])).toEqual([
      ["incomplete", "Captcha à résoudre dans l'onglet."],
      ["ready", null],
    ]);
    await vi.waitFor(() =>
      expect(f.notify).toHaveBeenCalledWith({
        message:
          "1 prête à envoyer · 1 captcha à résoudre — 18 crédits dépensés.",
        title: "File terminée : 2 candidatures vous attendent",
      }),
    );
    expect(await f.queue.firstWaitingTab()).toBe(100);
  });

  it("checks the budget against the balance, and keeps the profile's gaps first", async () => {
    const f = setup({ balance: 10 });
    await expect(
      f.queue.start({ budget: 18, offers: [offer("1")] }),
    ).rejects.toThrow("Votre solde (10 crédits) est sous ce budget.");
    await expect(f.queue.start({ budget: 9, offers: [] })).rejects.toThrow(
      "Choisissez une offre.",
    );
    await f.queue.start({
      budget: 9,
      identity: { phone: "0600000000" },
      offers: [offer("1")],
    });
    expect(f.filling.keepIdentity).toHaveBeenCalledWith({
      phone: "0600000000",
    });
    await expect(
      f.queue.start({ budget: 9, offers: [offer("2")] }),
    ).rejects.toThrow("Une file est déjà en cours.");
  });
});

describe("ApplicationQueue: sending and state", () => {
  it("sends one item on the candidate's click, its tab brought to the front", async () => {
    const f = setup();
    await f.queue.start({ budget: 9, offers: [offer("1")] });
    await f.settle();
    const outcome = await f.queue.send(0);
    expect(outcome.confirmed).toBe(true);
    expect(f.tabs.focus).toHaveBeenCalledWith(100);
    expect(f.sending.send).toHaveBeenCalledWith({
      applicationId: "app-100",
      url: "https://jobs.lever.co/acme/1",
    });
    expect((await f.queue.status())!.items[0]!.state).toBe("sent");
    await expect(f.queue.send(0)).rejects.toThrow("pas prête");
  });

  it("keeps the queue across a service worker restart, marking the cut", async () => {
    const store = memoryStore();
    const saved: Queue = {
      budget: 9,
      id: "old",
      items: [
        {
          applicationId: null,
          creditsSpent: 0,
          filledCount: 0,
          offer: offer("1"),
          reason: null,
          state: "working",
          step: "fill",
          tabId: 3,
        },
      ],
      running: true,
      spent: 0,
      stopRequested: false,
    };
    await store.set("queue", saved);
    const status = await setup({ store }).queue.status();
    expect(status).toMatchObject({ running: false });
    expect(status!.items[0]!.state).toBe("failed");
    expect((store.data.get("queue") as Queue).running).toBe(false);
  });

  it("stops after the current offer, and forgets a finished queue", async () => {
    const f = setup();
    await f.queue.start({ budget: 50, offers: [offer("1"), offer("2")] });
    await f.queue.stop();
    const done = await f.settle();
    expect(done.items.filter((item) => item.state === "skipped")).not.toEqual(
      [],
    );
    expect(await f.queue.clear()).toBeNull();
    expect(await f.queue.status()).toBeNull();
  });
});

describe("ApplicationQueue: this morning's offers (US-206)", () => {
  const match = (jobId: string, score: number, applyUrl: string) => ({
    applicationId: null,
    applyUrl,
    company: "Acme",
    jobId,
    score,
    status: "new",
    title: jobId,
  });

  it("offers this morning's selection, ticked by score, LinkedIn left out", async () => {
    const f = setup({
      daily: {
        digestDate: "2026-11-27",
        matches: [
          match("d1", 60, "https://jobs.lever.co/acme/d1"),
          match("d2", 90, "https://jobs.ashbyhq.com/acme/d2"),
          match("d3", 99, "https://www.linkedin.com/jobs/view/3"),
        ],
      },
    });
    const candidates = await f.queue.candidates();
    expect(candidates).toMatchObject({
      daily: ["d2", "d1"],
      kind: "ready",
      suggested: ["d2", "d1"],
    });
  });

  it("falls back to the recent offers when the selection cannot be read", async () => {
    const f = setup({ daily: new Error("indisponible") });
    expect(await f.queue.candidates()).toMatchObject({
      daily: [],
      kind: "ready",
    });
  });
});

describe("mergeOffers", () => {
  it("lists this morning's offers first, once, flagged", () => {
    const today = {
      applicationId: null,
      applyUrl: "https://jobs.lever.co/acme/1",
      company: "Acme",
      jobId: "j1",
      score: 70,
      status: "new",
      title: "Dev",
    };
    const merged = mergeOffers(
      [{ ...today, jobId: "j0", title: "Old" }, today],
      [],
      [today],
    );
    expect(merged.map((o) => [o.key, o.daily ?? false])).toEqual([
      ["j1", true],
      ["j0", false],
    ]);
  });

  it("drops applied offers and folds an open tab into its JobSpark offer", () => {
    const merged = mergeOffers(
      [
        {
          applicationId: null,
          applyUrl: "https://jobs.lever.co/acme/1?utm_source=x",
          company: "Acme",
          jobId: "j1",
          score: 80,
          status: "new",
          title: "Dev",
        },
        {
          applicationId: "a",
          applyUrl: "https://jobs.lever.co/acme/2",
          company: "Acme",
          jobId: "j2",
          status: "applied",
          title: "Lead",
        },
      ],
      [
        { tabId: 5, title: "Dev — Acme", url: "https://jobs.lever.co/acme/1" },
        {
          tabId: 6,
          title: "Ops — Beta",
          url: "https://boards.greenhouse.io/b/1",
        },
      ],
    );
    expect(merged).toEqual([
      expect.objectContaining({ key: "j1", score: 80, tabId: 5 }),
      expect.objectContaining({
        company: "boards.greenhouse.io",
        key: "tab:6",
        source: "tab",
        tabId: 6,
      }),
    ]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationSummary } from "../domain/offer";
import type { FillerRun } from "../filler-messages";
import type { PrefillReport } from "../page/prefill";
import { Filling, type FillTab } from "./filling";
import type { ActiveTab } from "./preparation";
import type { AiKeySettings } from "./session";

const URL_ = "https://jobs.lever.co/acme/1/apply";
const TAB: ActiveTab = { tabId: 9, title: "Apply", url: URL_ };
const KEY: AiKeySettings = {
  apiKey: "sk-or-secret",
  baseURL: "https://openrouter.ai/api/v1",
  model: "m",
};

/** What the script pass leaves: one required question, for the model. */
const LEFT_TO_MODEL: PrefillReport = {
  attached: ["CV Camille Test.pdf"],
  filled: [{ label: "Email", value: "c@example.com" }],
  optionalEmpty: [],
  remaining: ["Salaire ?"],
};

/** A tab that is already the form: nothing to open. */
const FORM_PAGE = {
  open: async () => undefined,
  prefill: async () => LEFT_TO_MODEL,
  probe: async () => ({ applyLink: null, fieldCount: 8 }),
};

const ready = (over: Partial<ApplicationSummary> = {}): ApplicationSummary => ({
  company: "Acme",
  cvGeneratedAt: "x",
  id: "a1",
  letterGeneratedAt: "y",
  offerUrl: "https://jobs.lever.co/acme/1",
  status: "draft",
  title: "Dev",
  ...over,
});

function setup(
  options: {
    key?: AiKeySettings | null;
    apps?: ApplicationSummary[];
    probe?: { applyLink: string | null; fieldCount: number };
    prefill?: PrefillReport;
  } = {},
) {
  let tab: ActiveTab | null | "no-access" = TAB;
  let runRequest: FillerRun | null = null;
  const apps = options.apps ?? [
    ready(),
    ready({ cvGeneratedAt: null, id: "a2" }),
  ];
  const call = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    switch (name) {
      case "list_applications":
        return apps;
      case "get_profile":
        return {
          activeProfileId: "p1",
          profiles: [
            {
              id: "p1",
              identity: {
                city: "Nantes",
                email: "c@example.com",
                firstName: "Camille",
                lastName: "Test",
                links: [],
                phone: "0600000000",
              },
            },
          ],
        };
      case "get_screening_answers":
        return { custom: [], fromProfile: null, known: [] };
      case "get_document_download_url":
        return { url: `https://api.example/mcp/files/${String(args?.kind)}` };
      case "save_screening_answer":
        return { saved: true };
      case "get_credit_balance":
        return { balance: 20 };
      case "start_form_fill":
        return { creditsSpent: 2, fillSessionId: "fill-1" };
    }
    throw new Error(`unexpected ${name}`);
  });
  const candidate = {
    ask: vi.fn(
      async (
        _question: string,
      ): Promise<{ answer: string | null; save: boolean }> => ({
        answer: "45 k€",
        save: true,
      }),
    ),
  };
  const fetchFn = vi.fn(async () => new Response('{"ok":1}', { status: 200 }));
  const filling = new Filling({
    aiKeys: {
      clear: async () => undefined,
      get: async () => (options.key === undefined ? KEY : options.key),
      save: async () => undefined,
    },
    candidate,
    download: vi.fn(async (url: string) => ({
      base64: btoa(url),
      mime: "application/pdf",
    })),
    fetchFn: fetchFn as unknown as typeof fetch,
    relay: {
      accessToken: async () => "oauth-access",
      origin: "https://api.example",
    },
    pages: { activeTab: async () => tab, readText: async () => "" },
    tab: {
      open: vi.fn(async () => undefined),
      prefill: vi.fn(async () => options.prefill ?? LEFT_TO_MODEL),
      probe: vi.fn(
        async () => options.probe ?? { applyLink: null, fieldCount: 8 },
      ),
      run: vi.fn(async (_tabId, request) => {
        runRequest = request;
        // While running, the page asks for the CV, a model call and a question.
        await filling.handle(9, { kind: "cv", type: "filler/document" });
        await filling.handle(9, { question: "Salaire ?", type: "filler/ask" });
        return {
          steps: 6,
          success: true,
          summary: "Rempli, champ « vélo » vide.",
        };
      }),
    } satisfies FillTab,
    tools: { call },
  });
  return {
    call,
    candidate,
    fetchFn,
    filling,
    lastRun: () => runRequest,
    setTab: (next: typeof tab) => {
      tab = next;
    },
  };
}

describe("Filling.options", () => {
  it("offers the applications that have their CV and letter, this form's first", async () => {
    const f = setup({
      apps: [ready({ id: "other", offerUrl: null }), ready()],
    });
    expect(await f.filling.options()).toEqual({
      applications: [
        { company: "Acme", id: "other", title: "Dev" },
        { company: "Acme", id: "a1", title: "Dev" },
      ],
      balance: 20,
      fillCost: 0,
      host: "jobs.lever.co",
      kind: "page",
      personalKey: true,
      profileGaps: [
        { field: "linkedin", label: "Profil LinkedIn (LinkedIn URL)" },
      ],
      // …/acme/1/apply is the form of …/acme/1.
      suggestedId: "a1",
      url: URL_,
    });
  });

  it("matches the application of this page when there is one", async () => {
    const f = setup({
      apps: [ready({ id: "other", offerUrl: null }), ready()],
    });
    f.setTab({ ...TAB, url: "https://jobs.lever.co/acme/1" });
    expect(await f.filling.options()).toMatchObject({ suggestedId: "a1" });
  });

  it("reports missing access or page", async () => {
    const f = setup();
    f.setTab("no-access");
    expect(await f.filling.options()).toEqual({ kind: "no-access" });
    f.setTab(null);
    expect(await f.filling.options()).toEqual({ kind: "no-page" });
  });
});

describe("Filling.fill", () => {
  let f: ReturnType<typeof setup>;
  beforeEach(() => {
    f = setup();
  });

  it("runs page-agent with the candidate's data, documents ready, and no key", async () => {
    const outcome = await f.filling.fill({ applicationId: "a1", url: URL_ });

    const run = f.lastRun()!;
    expect(run.llm).toEqual({ baseURL: KEY.baseURL, model: "m" });
    expect(JSON.stringify(run)).not.toContain("sk-or-secret");
    expect(run.task).toContain("- Prénom (First name) : Camille");
    expect(run.task).toContain("offre : Dev chez Acme");
    expect(f.call).toHaveBeenCalledWith("get_document_download_url", {
      applicationId: "a1",
      format: "pdf",
      kind: "letter",
    });
    expect(outcome).toEqual({
      aiUsed: true,
      answersSaved: 1,
      creditsSpent: 0,
      formUrl: null,
      optionalEmpty: [],
      prefilled: LEFT_TO_MODEL.filled,
      questionsAsked: 1,
      success: true,
      summary: "Rempli, champ « vélo » vide.",
    });
    // The model only finishes what the script left (US-203).
    expect(run.task).toContain(
      "Champs déjà remplis, n'y touche pas :\n- Email",
    );
    expect(run.task).toContain("Champs à remplir :\n- Salaire ?");
    expect(run.task).toContain("Documents déjà joints");
  });

  it("answers from the candidate's data instead of asking them", async () => {
    const replies: unknown[] = [];
    (f.filling as unknown as { deps: { tab: FillTab } }).deps.tab = {
      ...FORM_PAGE,
      run: async () => {
        for (const question of ["First name", "Prénom *", "Email", "Phone"]) {
          replies.push(
            await f.filling.handle(9, { question, type: "filler/ask" }),
          );
        }
        return { steps: 4, success: true, summary: "" };
      },
    };
    await f.filling.fill({ applicationId: "a1", url: URL_ });
    expect(f.candidate.ask).not.toHaveBeenCalled();
    expect(replies).toEqual([
      { answer: "Camille" },
      { answer: "Camille" },
      { answer: "c@example.com" },
      { answer: "0600000000" },
    ]);
  });

  it("keeps what the panel collected for the profile's gaps and fills with it", async () => {
    await f.filling.fill({
      applicationId: "a1",
      identity: { linkedin: " https://linkedin.com/in/camille ", phone: "" },
      url: URL_,
    });
    expect(f.call).toHaveBeenCalledWith("save_screening_answer", {
      answer: "https://linkedin.com/in/camille",
      question: "Profil LinkedIn (LinkedIn URL)",
    });
    expect(f.call).not.toHaveBeenCalledWith(
      "save_screening_answer",
      expect.objectContaining({ question: "Téléphone (Phone)" }),
    );
  });

  it("saves an answer the candidate chose to keep", async () => {
    await f.filling.fill({ applicationId: "a1", url: URL_ });
    expect(f.candidate.ask).toHaveBeenCalledWith("Salaire ?");
    expect(f.call).toHaveBeenCalledWith("save_screening_answer", {
      answer: "45 k€",
      question: "Salaire ?",
    });
  });

  it("never asks the candidate the same question twice", async () => {
    const answersSeen: unknown[] = [];
    (f.filling as unknown as { deps: { tab: FillTab } }).deps.tab = {
      ...FORM_PAGE,
      run: async () => {
        for (const question of [
          "Current Company",
          "current company ?",
          "Années d'expérience ?",
        ]) {
          answersSeen.push(
            await f.filling.handle(9, { question, type: "filler/ask" }),
          );
        }
        return { steps: 3, success: true, summary: "" };
      },
    };
    f.candidate.ask.mockResolvedValueOnce({ answer: null, save: false });
    const outcome = await f.filling.fill({ applicationId: "a1", url: URL_ });

    expect(f.candidate.ask).toHaveBeenCalledTimes(2);
    expect(answersSeen[1]).toEqual({
      answer: expect.stringContaining("Déjà demandé"),
    });
    expect(outcome.questionsAsked).toBe(2);
  });

  it("does not re-ask a rephrased question, and stops after eight", async () => {
    const replies: unknown[] = [];
    (f.filling as unknown as { deps: { tab: FillTab } }).deps.tab = {
      ...FORM_PAGE,
      run: async () => {
        const questions = [
          "What is your level of German?",
          "German level (What is your level of German? requis)",
          "Salary expectations",
          "Notice period",
          "Visa sponsorship",
          "Relocation Barcelona",
          "Driving licence",
          "Pronouns",
          "Portfolio website",
          "Referral source",
          "Availability start",
        ];
        for (const question of questions) {
          replies.push(
            await f.filling.handle(9, { question, type: "filler/ask" }),
          );
        }
        return { steps: 1, success: true, summary: "" };
      },
    };
    f.candidate.ask.mockResolvedValue({ answer: null, save: false });
    const outcome = await f.filling.fill({ applicationId: "a1", url: URL_ });

    expect(replies[1]).toEqual({
      answer: expect.stringContaining("ne repose pas"),
    });
    expect(outcome.questionsAsked).toBe(8);
    expect(replies.at(-1)).toEqual({
      answer: expect.stringContaining("Plus de question"),
    });
  });

  it("still answers the form when saving fails (older connection)", async () => {
    f.call.mockImplementation(async (name: string) => {
      if (name === "save_screening_answer")
        throw new Error("insufficient_scope");
      return setup().call.getMockImplementation()!(name);
    });
    await expect(
      f.filling.fill({ applicationId: "a1", url: URL_ }),
    ).resolves.toMatchObject({ answersSaved: 0, questionsAsked: 1 });
  });

  it("needs the same tab and a ready application", async () => {
    await expect(
      f.filling.fill({ applicationId: "a1", url: "https://other.example" }),
    ).rejects.toThrow("onglet a changé");
    await expect(
      f.filling.fill({ applicationId: "a2", url: URL_ }),
    ).rejects.toThrow("CV et sa lettre");
  });

  it("refuses page requests outside a fill, or from another tab", async () => {
    expect(
      await f.filling.handle(9, { kind: "cv", type: "filler/document" }),
    ).toEqual({
      error: "Aucun remplissage en cours pour cet onglet.",
    });
    const g = setup();
    let fromOtherTab: unknown;
    const tabRun = vi.fn(async () => {
      fromOtherTab = await g.filling.handle(3, {
        kind: "cv",
        type: "filler/document",
      });
      return { steps: 0, success: true, summary: "" };
    });
    (g.filling as unknown as { deps: { tab: FillTab } }).deps.tab = {
      ...FORM_PAGE,
      run: tabRun,
    };
    await g.filling.fill({ applicationId: "a1", url: URL_ });
    expect(fromOtherTab).toEqual({
      error: "Aucun remplissage en cours pour cet onglet.",
    });
  });
});

describe("Filling: from the offer page", () => {
  it("opens the form behind « Postuler », then fills it", async () => {
    const f = setup({
      probe: { applyLink: "https://jobs.lever.co/acme/1/apply", fieldCount: 0 },
    });
    const tab = (f.filling as unknown as { deps: { tab: FillTab } }).deps.tab;

    const outcome = await f.filling.fill({ applicationId: "a1", url: URL_ });

    expect(tab.open).toHaveBeenCalledWith(
      9,
      "https://jobs.lever.co/acme/1/apply",
    );
    expect(outcome.formUrl).toBe("https://jobs.lever.co/acme/1/apply");
  });

  it("fills the page as it is when it is already the form or has no link", async () => {
    for (const probe of [
      { applyLink: "https://jobs.lever.co/acme/1/apply", fieldCount: 6 },
      { applyLink: null, fieldCount: 0 },
    ]) {
      const f = setup({ probe });
      const tab = (f.filling as unknown as { deps: { tab: FillTab } }).deps.tab;
      expect(
        (await f.filling.fill({ applicationId: "a1", url: URL_ })).formUrl,
      ).toBeNull();
      expect(tab.open).not.toHaveBeenCalled();
    }
  });
});

describe("Filling for the queue (US-204)", () => {
  it("fills a background tab without asking the candidate anything", async () => {
    const f = setup();
    f.setTab(null); // the candidate looks elsewhere
    const outcome = await f.filling.fillTab(
      TAB,
      { applicationId: "a1" },
      { unattended: true },
    );
    expect(outcome.questionsAsked).toBe(0);
    expect(f.candidate.ask).not.toHaveBeenCalled();
  });

  it("finds a form, or the link to it, before anything is spent", async () => {
    expect(await setup().filling.formReachable(9)).toBe(true);
    expect(
      await setup({
        probe: {
          applyLink: "https://jobs.lever.co/acme/1/apply",
          fieldCount: 0,
        },
      }).filling.formReachable(9),
    ).toBe(true);
    expect(
      await setup({
        probe: { applyLink: null, fieldCount: 1 },
      }).filling.formReachable(9),
    ).toBe(false);
  });
});

describe("Filling: the script first, the model only for the rest (US-203)", () => {
  const ALL_DONE = {
    ...LEFT_TO_MODEL,
    optionalEmpty: ["Pronouns"],
    remaining: [],
  };

  it("costs nothing and calls no model when the script filled every required field", async () => {
    const f = setup({ key: null, prefill: ALL_DONE });
    const outcome = await f.filling.fill({ applicationId: "a1", url: URL_ });
    expect(outcome).toMatchObject({
      aiUsed: false,
      creditsSpent: 0,
      optionalEmpty: ["Pronouns"],
      success: true,
    });
    expect(f.lastRun()).toBeNull();
    expect(f.call).not.toHaveBeenCalledWith(
      "start_form_fill",
      expect.anything(),
    );
    // The review knows the form was filled, without the model.
    expect(f.filling.lastFill(9)).toMatchObject({ applicationId: "a1" });
  });

  it("has the model try the optional fields only when the candidate asks", async () => {
    const f = setup({ key: null, prefill: ALL_DONE });
    const outcome = await f.filling.fill({
      applicationId: "a1",
      completeOptional: true,
      url: URL_,
    });
    expect(outcome).toMatchObject({ aiUsed: true, creditsSpent: 2 });
    expect(f.lastRun()!.task).toContain("Champs à remplir :\n- Pronouns");
  });
});

describe("Filling with JobSpark's model (no personal key)", () => {
  it("announces the cost, then opens a paid session only once all is ready", async () => {
    const f = setup({ key: null });
    expect(await f.filling.options()).toMatchObject({
      balance: 20,
      fillCost: 2,
      personalKey: false,
    });

    let relayed: unknown;
    let refused: unknown;
    let sent: FillerRun | null = null;
    (f.filling as unknown as { deps: { tab: FillTab } }).deps.tab = {
      ...FORM_PAGE,
      run: async (_tabId, request) => {
        sent = request;
        relayed = await f.filling.handle(9, {
          body: "{}",
          type: "filler/llm-fetch",
          url: "https://api.example/agent/llm/chat/completions",
        });
        refused = await f.filling.handle(9, {
          type: "filler/llm-fetch",
          url: "https://openrouter.ai/api/v1/chat/completions",
        });
        return { steps: 1, success: true, summary: "" };
      },
    };
    const outcome = await f.filling.fill({ applicationId: "a1", url: URL_ });

    const names = f.call.mock.calls.map(([name]) => name);
    expect(names.indexOf("start_form_fill")).toBeGreaterThan(
      names.lastIndexOf("get_document_download_url"),
    );
    expect(sent!.llm).toEqual({
      baseURL: "https://api.example/agent/llm",
      model: "jobspark",
    });
    expect(relayed).toEqual({ body: '{"ok":1}', status: 200 });
    expect(f.fetchFn).toHaveBeenCalledWith(
      "https://api.example/agent/llm/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer oauth-access",
          "x-jobspark-fill-session": "fill-1",
        }),
      }),
    );
    expect(refused).toEqual({ error: "Adresse du modèle non autorisée." });
    expect(outcome.creditsSpent).toBe(2);
  });

  it("refreshes an expired access token once, mid-fill", async () => {
    const f = setup({ key: null });
    f.fetchFn
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response('{"ok":2}', { status: 200 }));
    let relayed: unknown;
    (f.filling as unknown as { deps: { tab: FillTab } }).deps.tab = {
      ...FORM_PAGE,
      run: async () => {
        relayed = await f.filling.handle(9, {
          type: "filler/llm-fetch",
          url: "https://api.example/agent/llm/chat/completions",
        });
        return { steps: 1, success: true, summary: "" };
      },
    };
    await f.filling.fill({ applicationId: "a1", url: URL_ });
    expect(relayed).toEqual({ body: '{"ok":2}', status: 200 });
    expect(f.call).toHaveBeenCalledWith("get_credit_balance");
  });
});

describe("Filling: model calls relayed for the page", () => {
  it("adds the key only for the configured provider", async () => {
    const f = setup();
    let relayed: unknown;
    let refused: unknown;
    (f.filling as unknown as { deps: { tab: FillTab } }).deps.tab = {
      ...FORM_PAGE,
      run: async () => {
        relayed = await f.filling.handle(9, {
          body: "{}",
          type: "filler/llm-fetch",
          url: `${KEY.baseURL}/chat/completions`,
        });
        refused = await f.filling.handle(9, {
          type: "filler/llm-fetch",
          url: "https://evil.example/v1/chat/completions",
        });
        return { steps: 1, success: true, summary: "" };
      },
    };
    await f.filling.fill({ applicationId: "a1", url: URL_ });

    expect(relayed).toEqual({ body: '{"ok":1}', status: 200 });
    expect(f.fetchFn).toHaveBeenCalledWith(
      `${KEY.baseURL}/chat/completions`,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer sk-or-secret",
        }),
      }),
    );
    expect(refused).toEqual({ error: "Adresse du modèle non autorisée." });
  });
});

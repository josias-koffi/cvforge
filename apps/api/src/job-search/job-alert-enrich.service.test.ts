import {
  DEFAULT_JOB_ALERT_PREFERENCES,
  type JobAlertPreferences,
} from "@cvforge/types";
import { describe, expect, it, vi } from "vitest";
import { InsufficientCreditsException } from "../credits/credits.service";
import type {
  AiAnalysisStatus,
  AlertToAnalyse,
} from "./alert-matches.pg-store";
import {
  JobAlertEnricher,
  resolveJobAlertEnrichConfig,
  toAnalysisProfile,
} from "./job-alert-enrich.service";
import { MemoryCursors } from "./job-stream.testing";

/** 10:00 in Paris. */
const NOW = Date.parse("2026-10-02T08:00:00Z");

const ANSWER = JSON.stringify({
  aMettreEnAvant: [{ competences: ["React"], texte: "Vos projets React" }],
  raisons: [
    { competences: ["TypeScript"], texte: "Même stack" },
    "Équipe produit",
  ],
  verdict: "a_saisir",
  vigilance: [],
});

function alert(id: string, userEmail = "ada@example.com"): AlertToAnalyse {
  return {
    detectedAt: new Date(NOW - 10_000).toISOString(),
    id,
    job: {
      companyName: "Doctolib",
      contractType: "cdi",
      description: "React, TypeScript",
      locationLabel: "Nantes",
      remote: false,
      salaryLabel: "",
      title: "Développeur full stack",
    },
    matchedSkills: ["React"],
    missingSkills: [],
    profileId: "profile-1",
    userEmail,
  };
}

function createEnricher(input: {
  queue?: AlertToAnalyse[];
  balance?: number;
  today?: { done: number; attempts: number };
  preferences?: Partial<JobAlertPreferences>;
  answer?: () => Promise<string>;
  dailyCap?: number;
}) {
  const saved = new Map<
    string,
    { status: AiAnalysisStatus; verdict: string | null }
  >();
  const ledger = new Map<string, number>();
  let balance = input.balance ?? 5;
  const credits = {
    assertSufficientCredits: vi.fn(async () => {
      if (balance < 1)
        throw new InsufficientCreditsException("job_alert_enrich");
    }),
    // Same contract as the ledger: a reused key debits nothing.
    consumeCredits: vi.fn(async (entry: { idempotencyKey?: string }) => {
      if (entry.idempotencyKey && ledger.has(entry.idempotencyKey))
        return {} as never;
      if (balance < 1)
        throw new InsufficientCreditsException("job_alert_enrich");
      balance -= 1;
      ledger.set(entry.idempotencyKey ?? String(ledger.size), 1);
      return {} as never;
    }),
  };
  const openRouter = { chat: vi.fn(input.answer ?? (async () => ANSWER)) };
  const enricher = new JobAlertEnricher({
    alerts: {
      analysesOn: vi.fn(async () => ({
        ...(input.today ?? { attempts: 0, done: 0 }),
      })),
      listToAnalyse: vi.fn(async () => input.queue ?? []),
      saveAnalysis: vi.fn(async (id, result) => {
        saved.set(id, {
          status: result.status,
          verdict: result.analysis?.verdict ?? null,
        });
      }),
    },
    config: { dailyCap: input.dailyCap ?? 20 },
    credits,
    cursors: new MemoryCursors(),
    notifications: {
      readJobAlertPreferences: vi.fn(async () => ({
        ...DEFAULT_JOB_ALERT_PREFERENCES,
        aiAnalysis: true,
        ...input.preferences,
      })),
    },
    now: () => NOW,
    openRouter,
    owner: "instance-1",
    profiles: {
      findByUserEmail: vi.fn(async () => ({
        activeProfileId: "profile-1",
        profiles: [
          {
            headline: "Développeuse",
            id: "profile-1",
            identity: {
              email: "ada@example.com",
              firstName: "Ada",
              lastName: "Lovelace",
            },
            sections: {
              experiences: [],
              softSkills: [],
              technicalSkills: ["TypeScript", "React"],
            },
          },
        ],
      })) as never,
    },
  });

  return { balance: () => balance, credits, enricher, openRouter, saved };
}

describe("JobAlertEnricher", () => {
  it("analyses each fresh alert and charges one credit for the whole day", async () => {
    const { balance, credits, enricher, saved } = createEnricher({
      queue: [alert("a1"), alert("a2"), alert("a3")],
    });

    expect(await enricher.tick()).toMatchObject({ outcomes: { done: 3 } });
    expect([...saved.values()]).toEqual([
      { status: "done", verdict: "seize" },
      { status: "done", verdict: "seize" },
      { status: "done", verdict: "seize" },
    ]);
    expect(credits.consumeCredits).toHaveBeenCalledTimes(1);
    expect(credits.consumeCredits).toHaveBeenCalledWith({
      action: "job_alert_enrich",
      idempotencyKey: "job_alert_enrich:ada@example.com:2026-10-02",
      userEmail: "ada@example.com",
    });
    expect(balance()).toBe(4);
  });

  it("charges nothing more on a day already paid for", async () => {
    const { credits, enricher } = createEnricher({
      queue: [alert("a1")],
      today: { attempts: 4, done: 4 },
    });

    await enricher.tick();

    expect(credits.assertSufficientCredits).not.toHaveBeenCalled();
    expect(credits.consumeCredits).not.toHaveBeenCalled();
  });

  it("charges nothing when the call fails, and the alert goes without", async () => {
    const { credits, enricher, saved } = createEnricher({
      answer: async () => {
        throw new Error("model down");
      },
      queue: [alert("a1")],
    });

    await enricher.tick();

    expect(saved.get("a1")).toEqual({ status: "failed", verdict: null });
    expect(credits.consumeCredits).not.toHaveBeenCalled();
  });

  it("charges nothing for an answer that does not hold up", async () => {
    const { credits, enricher, saved } = createEnricher({
      answer: async () => '{"verdict":"génial"}',
      queue: [alert("a1")],
    });

    await enricher.tick();

    expect(saved.get("a1")?.status).toBe("failed");
    expect(credits.consumeCredits).not.toHaveBeenCalled();
  });

  it("makes no call on an empty balance: the alert goes, marked without analysis", async () => {
    const { enricher, openRouter, saved } = createEnricher({
      balance: 0,
      queue: [alert("a1")],
    });

    await enricher.tick();

    expect(openRouter.chat).not.toHaveBeenCalled();
    expect(saved.get("a1")).toEqual({ status: "no_credit", verdict: null });
  });

  it("stops at the daily cap, failed calls included", async () => {
    const { enricher, openRouter, saved } = createEnricher({
      dailyCap: 20,
      queue: [alert("a1"), alert("a2")],
      today: { attempts: 19, done: 18 },
    });

    await enricher.tick();

    expect(openRouter.chat).toHaveBeenCalledTimes(1);
    expect(saved.get("a1")?.status).toBe("done");
    expect(saved.get("a2")?.status).toBe("capped");
  });

  it("does nothing on a day without alerts, and nothing for a candidate without the option", async () => {
    const empty = createEnricher({ queue: [] });
    await empty.enricher.tick();
    expect(empty.credits.assertSufficientCredits).not.toHaveBeenCalled();

    const off = createEnricher({
      preferences: { aiAnalysis: false },
      queue: [alert("a1")],
    });
    await off.enricher.tick();
    expect(off.openRouter.chat).not.toHaveBeenCalled();
    expect(off.saved.size).toBe(0);
  });

  it("logs every call under its own feature, for the cockpit", async () => {
    const { enricher, openRouter } = createEnricher({ queue: [alert("a1")] });

    await enricher.tick();

    expect(openRouter.chat).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ feature: "job_alert_enrich" }),
    );
  });
});

describe("toAnalysisProfile", () => {
  it("keeps the roles and the skills, never the employer nor the person", () => {
    const profile = toAnalysisProfile({
      headline: "Développeuse",
      identity: { email: "ada@example.com", firstName: "Ada" },
      sections: {
        experiences: [
          {
            company: "Secret SA",
            period: "2021",
            results: "",
            role: "Développeuse",
          },
        ],
        softSkills: ["Rigueur"],
        technicalSkills: ["React"],
      },
    } as never);

    expect(profile).toEqual({
      experiences: [{ period: "2021", role: "Développeuse" }],
      headline: "Développeuse",
      skills: ["React", "Rigueur"],
    });
    expect(JSON.stringify(profile)).not.toMatch(/Secret|Ada|@/);
  });
});

describe("resolveJobAlertEnrichConfig", () => {
  it("allows 20 analyses a day by default", () => {
    expect(resolveJobAlertEnrichConfig({})).toEqual({ dailyCap: 20 });
    expect(
      resolveJobAlertEnrichConfig({ JOB_ALERT_ENRICH_DAILY_CAP: "5" }),
    ).toEqual({ dailyCap: 5 });
  });
});

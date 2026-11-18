import {
  DEFAULT_JOB_ALERT_PREFERENCES,
  type InAppNotification,
  type JobAlertNotificationOffer,
  type JobAlertPreferences,
} from "@cvforge/types";
import { describe, expect, it, vi } from "vitest";
import type { AlertSendHistory, PendingAlert } from "./alert-matches.pg-store";
import {
  alertReasons,
  dueNow,
  isQuietHour,
  JobAlertDispatcher,
  MAX_OFFERS_PER_NOTIFICATION,
  resolveJobAlertConfig,
  sendable,
  sourceLabel,
} from "./job-alerts.service";
import { MemoryCursors } from "./job-stream.testing";

/** 10:00 in Paris (UTC+2 in October). */
const NOW = Date.parse("2026-10-02T08:00:00Z");
const CONFIG = { dailyImmediateCap: 10, dailyPushCap: 2 };

function pending(
  id: string,
  userEmail = "ada@example.com",
  overrides: Partial<PendingAlert> = {},
): PendingAlert {
  return {
    aiAnalysis: null,
    aiAnalysisStatus: null,
    companyName: "Doctolib",
    detectedAt: new Date(NOW - 3 * 60_000).toISOString(),
    id,
    jobId: `job-${id}`,
    locationLabel: "Nantes",
    matchedSkills: ["TypeScript", "React"],
    publishedAt: new Date(NOW - 5 * 60_000).toISOString(),
    remote: false,
    source: "france_travail",
    title: `Développeur ${id}`,
    userEmail,
    ...overrides,
  };
}

function createDispatcher(input: {
  alerts?: PendingAlert[];
  history?: Record<string, AlertSendHistory>;
  preferences?: Record<string, Partial<JobAlertPreferences>>;
  pushedToday?: number;
  failFor?: string;
  pushFails?: boolean;
  now?: number;
}) {
  const store = {
    listPending: vi.fn(async () => input.alerts ?? []),
    markAlertSent: vi.fn(async (_ids: readonly string[], _at: string) => {}),
    sendHistory: vi.fn(
      async () => new Map(Object.entries(input.history ?? {})),
    ),
  };
  const inbox = {
    add: vi.fn(
      async (alert: {
        userEmail: string;
        offers: JobAlertNotificationOffer[];
        reasons: string[];
        pushed: boolean;
      }) => {
        if (alert.userEmail === input.failFor) throw new Error("base indisponible");
        return {
          linkHref: "/offres-du-jour",
          message: "Doctolib, Nantes.",
          title: `${alert.offers.length} nouvelle(s) offre(s)`,
        } as InAppNotification;
      },
    ),
    countPushed: vi.fn(async () => input.pushedToday ?? 0),
  };
  const notifications = {
    readJobAlertPreferences: vi.fn(async (email: string) => ({
      ...DEFAULT_JOB_ALERT_PREFERENCES,
      ...input.preferences?.[email],
    })),
  };
  const push = {
    notify: vi.fn(async () => {
      if (input.pushFails) throw new Error("push indisponible");
      return 1;
    }),
  };
  const dispatcher = new JobAlertDispatcher(
    store,
    notifications,
    inbox,
    push,
    new MemoryCursors(),
    CONFIG,
    () => input.now ?? NOW,
    "instance-1",
  );

  return { dispatcher, inbox, push, store };
}

describe("JobAlertDispatcher", () => {
  it("raises one in-app notification per candidate, pushes it, then marks the alerts sent", async () => {
    const { dispatcher, inbox, push, store } = createDispatcher({
      alerts: [
        pending("a1"),
        pending("a2"),
        pending("g1", "grace@example.com"),
      ],
    });

    const result = await dispatcher.tick();

    expect(result).toMatchObject({
      notifications: 2,
      offers: 3,
      pushed: 2,
      status: "done",
    });
    expect(inbox.add).toHaveBeenCalledWith({
      offers: [
        {
          companyName: "Doctolib",
          jobId: "job-a1",
          locationLabel: "Nantes",
          sourceLabel: "France Travail",
          title: "Développeur a1",
          verdict: null,
        },
        expect.objectContaining({ title: "Développeur a2" }),
      ],
      pushed: true,
      reasons: ["vos compétences en TypeScript, React"],
      userEmail: "ada@example.com",
    });
    expect(push.notify).toHaveBeenCalledWith("ada@example.com", {
      body: "Doctolib, Nantes.",
      tag: "job-alert",
      title: "2 nouvelle(s) offre(s)",
      url: "/offres-du-jour",
    });
    expect(store.markAlertSent).toHaveBeenCalledWith(
      ["a1", "a2"],
      new Date(NOW).toISOString(),
    );
  });

  it("stops pushing past 2 a day: the next ones wait in the app", async () => {
    const { dispatcher, inbox, push, store } = createDispatcher({
      alerts: [pending("a1")],
      pushedToday: 2,
    });

    expect(await dispatcher.tick()).toMatchObject({
      notifications: 1,
      pushed: 0,
    });
    expect(inbox.add).toHaveBeenCalledWith(
      expect.objectContaining({ pushed: false }),
    );
    expect(push.notify).not.toHaveBeenCalled();
    expect(store.markAlertSent).toHaveBeenCalled();
  });

  it("only looks at the alerts of the last 24 hours: older ones are the recap's", async () => {
    const { dispatcher, store } = createDispatcher({});

    await dispatcher.tick();

    expect(store.listPending).toHaveBeenCalledWith(
      new Date(NOW - 86_400_000).toISOString(),
      500,
    );
  });

  it("sends nothing between 21:00 and 7:00, Paris time", async () => {
    // 23:30 in Paris.
    const { dispatcher, store } = createDispatcher({
      alerts: [pending("a1")],
      now: Date.parse("2026-10-02T21:30:00Z"),
    });

    expect(await dispatcher.tick()).toEqual({
      reason: "heures calmes",
      status: "skipped",
    });
    expect(store.listPending).not.toHaveBeenCalled();
  });

  it("leaves the alerts of a candidate who turned them off to the recap", async () => {
    const { dispatcher, inbox, store } = createDispatcher({
      alerts: [pending("a1")],
      preferences: { "ada@example.com": { enabled: false } },
    });

    expect(await dispatcher.tick()).toMatchObject({
      notifications: 0,
      waiting: 1,
    });
    expect(inbox.add).not.toHaveBeenCalled();
    expect(store.markAlertSent).not.toHaveBeenCalled();
  });

  it("names 20 offers at most per notification; the rest go next time", async () => {
    const many = Array.from({ length: 25 }, (_, index) => pending(`a${index}`));
    const { dispatcher, store } = createDispatcher({ alerts: many });

    await dispatcher.tick();

    expect(store.markAlertSent.mock.calls[0]?.[0]).toHaveLength(
      MAX_OFFERS_PER_NOTIFICATION,
    );
  });

  it("never lets one candidate's failure hold up the others", async () => {
    const { dispatcher, store } = createDispatcher({
      alerts: [pending("a1"), pending("g1", "grace@example.com")],
      failFor: "ada@example.com",
    });

    const result = await dispatcher.tick();

    expect(result).toMatchObject({
      errors: [expect.stringContaining("base indisponible")],
      notifications: 1,
    });
    expect(store.markAlertSent).toHaveBeenCalledWith(
      ["g1"],
      expect.any(String),
    );
  });

  it("does not announce the same offers twice when the push fails", async () => {
    const { dispatcher, store } = createDispatcher({
      alerts: [pending("a1")],
      pushFails: true,
    });

    await dispatcher.tick();

    expect(store.markAlertSent).toHaveBeenCalledWith(["a1"], expect.any(String));
  });
});

describe("with the paid analysis (US-168)", () => {
  const analysis = (verdict: "seize" | "skip") => ({
    highlights: [],
    reasons: ["Même stack"],
    verdict,
    watchouts: [],
  });
  const withOption = { ...DEFAULT_JOB_ALERT_PREFERENCES, aiAnalysis: true };
  const justNow = new Date(NOW - 20_000).toISOString();

  it("sends every alert to a candidate without the option, as before", () => {
    const alerts = [pending("a1", undefined, { detectedAt: justNow })];

    expect(sendable(alerts, DEFAULT_JOB_ALERT_PREFERENCES, NOW)).toEqual(
      alerts,
    );
  });

  it("holds a fresh alert a minute for its analysis, then lets it go without", () => {
    const fresh = pending("a1", undefined, { detectedAt: justNow });
    const late = pending("a2", undefined, {
      detectedAt: new Date(NOW - 61_000).toISOString(),
    });

    expect(
      sendable([fresh, late], withOption, NOW).map((alert) => alert.id),
    ).toEqual(["a2"]);
  });

  it("keeps an offer judged « à passer » out of the alert, unless the candidate turned the filter off", () => {
    const skip = pending("a1", undefined, {
      aiAnalysis: analysis("skip"),
      aiAnalysisStatus: "done",
    });
    const seize = pending("a2", undefined, {
      aiAnalysis: analysis("seize"),
      aiAnalysisStatus: "done",
    });

    expect(
      sendable([skip, seize], withOption, NOW).map((alert) => alert.id),
    ).toEqual(["a2"]);
    expect(
      sendable([skip, seize], { ...withOption, aiFilter: false }, NOW),
    ).toHaveLength(2);
  });

  it("puts the verdict beside the offer when there is one", async () => {
    const { dispatcher, inbox } = createDispatcher({
      alerts: [
        pending("a1", undefined, {
          aiAnalysis: analysis("seize"),
          aiAnalysisStatus: "done",
        }),
        pending("a2", undefined, { aiAnalysisStatus: "no_credit" }),
      ],
      preferences: { "ada@example.com": { aiAnalysis: true } },
    });

    await dispatcher.tick();

    const [alert] = inbox.add.mock.calls[0]!;
    expect(alert.offers.map((offer) => offer.verdict)).toEqual(["seize", null]);
  });
});

describe("dueNow", () => {
  const immediate = DEFAULT_JOB_ALERT_PREFERENCES;
  const hourly = {
    ...DEFAULT_JOB_ALERT_PREFERENCES,
    rhythm: "hourly" as const,
  };
  const sentAgo = (minutes: number, sentToday: number): AlertSendHistory => ({
    lastSentAt: new Date(NOW - minutes * 60_000).toISOString(),
    sentToday,
  });

  it("sends at once on the immediate rhythm, under the daily cap", () => {
    expect(dueNow(immediate, sentAgo(1, 9), 10, NOW)).toBe(true);
  });

  it("groups hourly past the daily cap", () => {
    expect(dueNow(immediate, sentAgo(30, 10), 10, NOW)).toBe(false);
    expect(dueNow(immediate, sentAgo(60, 10), 10, NOW)).toBe(true);
  });

  it("waits an hour between two notifications on the hourly rhythm", () => {
    expect(dueNow(hourly, sentAgo(59, 1), 10, NOW)).toBe(false);
    expect(dueNow(hourly, sentAgo(60, 1), 10, NOW)).toBe(true);
    expect(dueNow(hourly, { lastSentAt: null, sentToday: 0 }, 10, NOW)).toBe(
      true,
    );
  });
});

describe("isQuietHour", () => {
  it("is quiet from 21:00 to 6:59, Paris time", () => {
    expect(isQuietHour(Date.parse("2026-10-02T18:59:00Z"))).toBe(false); // 20:59
    expect(isQuietHour(Date.parse("2026-10-02T19:00:00Z"))).toBe(true); // 21:00
    expect(isQuietHour(Date.parse("2026-10-03T04:59:00Z"))).toBe(true); // 6:59
    expect(isQuietHour(Date.parse("2026-10-03T05:00:00Z"))).toBe(false); // 7:00
  });
});

describe("alert wording", () => {
  it("says why in the candidate's terms, and never leaves it empty", () => {
    expect(
      alertReasons({ matchedSkills: ["A", "B", "C", "D"], remote: true }),
    ).toEqual(["vos compétences en A, B, C", "télétravail possible"]);
    expect(alertReasons({ matchedSkills: [], remote: false })).toEqual([
      "le poste que vous cherchez, près de chez vous",
    ]);
  });

  it("cites the source of every offer", () => {
    expect(sourceLabel("france_travail")).toBe("France Travail");
    expect(sourceLabel("greenhouse")).toBe("Site carrière de l'entreprise");
  });
});

describe("resolveJobAlertConfig", () => {
  it("sends 10 immediate alerts a day by default", () => {
    expect(resolveJobAlertConfig({})).toEqual({
      dailyImmediateCap: 10,
      dailyPushCap: 2,
    });
    expect(
      resolveJobAlertConfig({ JOB_ALERT_DAILY_IMMEDIATE_CAP: "5" }),
    ).toEqual({ dailyImmediateCap: 5, dailyPushCap: 2 });
    expect(
      resolveJobAlertConfig({ JOB_ALERT_DAILY_PUSH_CAP: "0" }),
    ).toMatchObject({ dailyPushCap: 0 });
  });
});

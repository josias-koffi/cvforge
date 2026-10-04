import { describe, expect, it } from "vitest";
import type {
  ApplicationRetentionStore,
  WarnedApplication,
} from "./application-retention.pg-store";
import { ApplicationRetentionService } from "./application-retention.service";

const NOW = Date.parse("2026-10-04T08:00:00.000Z");
const DAY_MS = 86_400_000;

function warned(
  id: string,
  userEmail: string,
  updatedDaysAgo = 351,
): WarnedApplication {
  return {
    companyName: "Acme",
    id,
    title: `Poste ${id}`,
    updatedAt: new Date(NOW - updatedDaysAgo * DAY_MS).toISOString(),
    userEmail,
  };
}

function setup(
  options: {
    activated?: boolean;
    toWarn?: WarnedApplication[];
    emailed?: boolean;
    failFor?: string;
    policy?: string | null;
  } = {},
) {
  const runs: Array<Record<string, number>> = [];
  const sent: Array<{
    userEmail: string;
    applications: Array<{ id: string; deletesAt: string }>;
  }> = [];
  const store: ApplicationRetentionStore = {
    claimWarnings: async () => options.toWarn ?? [],
    countDue: async () => ({ toDelete: 4, toWarn: 7 }),
    deleteDue: async () => ({
      applications: 2,
      interviewSessions: 1,
      matchesDetached: 1,
      notifications: 3,
    }),
    listRuns: async () =>
      options.activated
        ? [{ ranAt: new Date(NOW).toISOString(), stats: {} }]
        : [],
    recordRun: async (stats) => {
      runs.push(stats);
    },
  };
  const service = new ApplicationRetentionService(
    store,
    {
      sendApplicationDeletionWarning: async (input) => {
        if (input.userEmail === options.failFor) throw new Error("smtp down");
        sent.push(input);
        return { emailed: options.emailed ?? true };
      },
    },
    async () => (options.policy === undefined ? null : options.policy),
    () => NOW,
  );

  return { runs, sent, service };
}

describe("ApplicationRetentionService (US-170)", () => {
  it("deletes what is due, then warns each candidate once with all their applications", async () => {
    const { runs, sent, service } = setup({
      toWarn: [
        warned("a1", "ada@example.com"),
        warned("a2", "ada@example.com", 400),
        warned("b1", "bob@example.com"),
      ],
    });

    const stats = await service.run();

    expect(
      sent.map((entry) => [
        entry.userEmail,
        entry.applications.map((a) => a.id),
      ]),
    ).toEqual([
      ["ada@example.com", ["a1", "a2"]],
      ["bob@example.com", ["b1"]],
    ]);
    // Warned today: never sooner than in 15 days, even a year and more after the change.
    expect(sent[0]?.applications.map((entry) => entry.deletesAt)).toEqual([
      new Date(NOW + 15 * DAY_MS).toISOString(),
      new Date(NOW + 15 * DAY_MS).toISOString(),
    ]);
    expect(stats).toEqual({
      candidatesWarned: 2,
      deleted: 2,
      emailsSent: 2,
      interviewSessionsDeleted: 1,
      matchesDetached: 1,
      notificationsDeleted: 3,
      warned: 3,
      warningFailures: 0,
    });
    expect(runs).toEqual([{ ...stats }]);
  });

  it("counts a candidate who turned the e-mail off as warned in the app only", async () => {
    const { service } = setup({
      emailed: false,
      toWarn: [warned("a1", "ada@example.com")],
    });

    expect(await service.run()).toMatchObject({
      candidatesWarned: 1,
      emailsSent: 0,
    });
  });

  it("goes on with the other candidates when one warning fails", async () => {
    const { sent, service } = setup({
      failFor: "ada@example.com",
      toWarn: [
        warned("a1", "ada@example.com"),
        warned("b1", "bob@example.com"),
      ],
    });

    expect(await service.run()).toMatchObject({
      candidatesWarned: 1,
      warningFailures: 1,
    });
    expect(sent.map((entry) => entry.userEmail)).toEqual(["bob@example.com"]);
  });

  it("never runs by itself before a first pass launched by hand", async () => {
    const idle = setup({ toWarn: [warned("a1", "ada@example.com")] });
    expect(await idle.service.runIfActivated()).toBeNull();
    expect(idle.sent).toEqual([]);

    const active = setup({ activated: true });
    expect(await active.service.runIfActivated()).not.toBeNull();
  });

  it("reads whether the published policy announces the rule", async () => {
    expect(await setup({ policy: null }).service.policyPublished()).toBe(false);
    expect(
      await setup({
        policy: "Vos candidatures : tant que le compte existe.",
      }).service.policyPublished(),
    ).toBe(false);
    expect(
      await setup({
        policy:
          "- Vos candidatures : un an après leur\n dernière modification, avec un rappel quinze jours avant.",
      }).service.policyPublished(),
    ).toBe(true);
  });

  it("counts without writing for the dry run", async () => {
    const { runs, sent, service } = setup();

    expect(await service.preview()).toEqual({ toDelete: 4, toWarn: 7 });
    expect(runs).toEqual([]);
    expect(sent).toEqual([]);
  });
});

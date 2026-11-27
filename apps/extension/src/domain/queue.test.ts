import { describe, expect, it } from "vitest";
import {
  exclusion,
  interrupted,
  maxOfferCost,
  newQueue,
  queueReport,
  suggested,
  summarize,
  type Queue,
  type QueueItem,
  type QueueItemState,
  type QueueOffer,
} from "./queue";

const offer = (over: Partial<QueueOffer> = {}): QueueOffer => ({
  company: "Acme",
  key: over.key ?? "k",
  source: "jobspark",
  title: "Dev",
  url: "https://jobs.lever.co/acme/1",
  ...over,
});

describe("queue rules", () => {
  it("leaves out sites that refuse automation or need an account", () => {
    expect(exclusion("https://www.linkedin.com/jobs/view/1")).toMatch(
      /LinkedIn/,
    );
    expect(exclusion("https://fr.indeed.com/viewjob?jk=1")).toMatch(/Indeed/);
    expect(exclusion("https://acme.wd3.myworkdayjobs.com/x")).toMatch(
      /Workday/,
    );
    expect(
      exclusion("https://candidat.francetravail.fr/offres/recherche/detail/1"),
    ).toMatch(/France Travail/);
    expect(exclusion("mailto:x@y.z")).toBe("Adresse non valide.");
    expect(exclusion("https://jobs.lever.co/acme/1")).toBeNull();
  });

  it("ticks JobSpark's best offers, never an open tab, ten at most", () => {
    const offers = [
      offer({ key: "low", score: 40 }),
      offer({ key: "tab", source: "tab", score: 99 }),
      offer({ key: "high", score: 90 }),
      offer({ key: "li", url: "https://www.linkedin.com/jobs/1", score: 95 }),
      ...Array.from({ length: 12 }, (_, i) => offer({ key: `n${i}` })),
    ];
    const keys = suggested(offers);
    expect(keys.slice(0, 2)).toEqual(["high", "low"]);
    expect(keys).not.toContain("tab");
    expect(keys).not.toContain("li");
    expect(keys).toHaveLength(10);
  });

  it("costs at most every preparation step and a fill", () => {
    expect(maxOfferCost(2)).toBe(9);
    expect(maxOfferCost(0)).toBe(7);
  });

  it("marks a run cut short as failed, keeping what was done", () => {
    const queue = newQueue("q", [offer({ key: "a" }), offer({ key: "b" })], 9);
    queue.items[0]!.state = "ready";
    queue.items[1]!.state = "working";
    const after = interrupted(queue);
    expect(after.running).toBe(false);
    expect(summarize(after)).toMatchObject({ failed: 1, ready: 1 });
    expect(interrupted(after)).toBe(after);
  });
});

describe("queueReport (US-209)", () => {
  const item = (state: QueueItemState, captcha = false): QueueItem => ({
    applicationId: null,
    captcha,
    creditsSpent: 0,
    filledCount: 0,
    offer: {
      company: null,
      key: state,
      source: "jobspark",
      title: "",
      url: "https://x.io",
    },
    reason: null,
    state,
    step: null,
    tabId: null,
  });
  const queue = (items: QueueItem[], over: Partial<Queue> = {}): Queue => ({
    budget: 30,
    id: "q",
    items,
    running: false,
    spent: 18,
    stopRequested: false,
    ...over,
  });

  it("counts what waits for the candidate, captchas apart", () => {
    expect(
      queueReport(
        queue([
          item("ready"),
          item("ready"),
          item("incomplete"),
          item("incomplete", true),
          item("skipped"),
          item("failed"),
        ]),
      ),
    ).toEqual({
      message:
        "2 prêtes à envoyer · 1 à compléter · 1 captcha à résoudre · 1 écartée · 1 échec — 18 crédits dépensés.",
      title: "File terminée : 4 candidatures vous attendent",
    });
  });

  it("says when the queue was stopped, or left nothing", () => {
    expect(
      queueReport(queue([item("ready")], { stopRequested: true })).title,
    ).toBe("File arrêtée");
    expect(queueReport(queue([item("skipped")], { spent: 0 }))).toEqual({
      message: "1 écartée — 0 crédit dépensé.",
      title: "File terminée",
    });
  });
});

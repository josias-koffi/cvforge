import { describe, expect, it } from "vitest";
import {
  exclusion,
  interrupted,
  maxOfferCost,
  newQueue,
  suggested,
  summarize,
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

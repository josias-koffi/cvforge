import { describe, expect, it } from "vitest";
import type { StoredJob } from "../jobs.types";
import type { ScoredJob } from "./job-matching";
import {
  buildRerankUserMessage,
  readRerankResponse,
  toRerankCandidates,
} from "./job-rerank";

function makeScored(id: string, overrides: Partial<StoredJob> = {}): ScoredJob {
  return {
    breakdown: {
      experience: 5,
      freshness: 10,
      location: 10,
      salary: 2,
      skills: 20,
      title: 25,
    },
    missingSkills: [],
    job: {
      closedAt: null,
      companyAnonymous: false,
      companyKey: "acme",
      companyName: "ACME",
      contractType: "cdi",
      department: "44",
      description: "Une annonce.",
      descriptionSimhash: "",
      firstSeenAt: "2026-09-22T08:00:00.000Z",
      id,
      lastSeenAt: "2026-09-23T08:00:00.000Z",
      latitude: null,
      locationLabel: "Nantes",
      longitude: null,
      primaryUrl: "https://example.com",
      publishedAt: "2026-09-21T08:00:00.000Z",
      remote: false,
      romeCode: null,
      romeCompetences: [],
      salaryLabel: "",
      title: `Poste ${id}`,
      titleKey: `poste ${id}`,
      ...overrides,
    },
    matchedSkills: ["TypeScript"],
    score: 72,
  };
}

describe("readRerankResponse", () => {
  const candidates = [makeScored("a"), makeScored("b"), makeScored("c")];

  it("reads the model's order and its reasons", () => {
    const ranked = readRerankResponse(
      {
        classement: [
          { id: "c", raison: "Stack identique à la vôtre." },
          { id: "a", raison: "Même métier, à Nantes." },
          { id: "b", raison: "Secteur proche." },
        ],
      },
      candidates,
    );

    expect(ranked.map((entry) => entry.id)).toEqual(["c", "a", "b"]);
    expect(ranked[0]).toMatchObject({ rank: 1, reason: "Stack identique à la vôtre." });
  });

  it("drops an offer the model invented", () => {
    const ranked = readRerankResponse(
      { classement: [{ id: "inventée", raison: "…" }, { id: "a", raison: "…" }] },
      candidates,
    );

    expect(ranked.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps an offer the model forgot, at the end", () => {
    const ranked = readRerankResponse({ classement: [{ id: "b", raison: "…" }] }, candidates);

    // The candidate must not lose an offer because a model skipped it.
    expect(ranked.map((entry) => entry.id)).toEqual(["b", "a", "c"]);
    expect(ranked[1]?.reason).toBe("");
  });

  it("ignores a duplicate the model returned twice", () => {
    const ranked = readRerankResponse(
      { classement: [{ id: "a" }, { id: "a" }, { id: "b" }] },
      candidates,
    );

    expect(ranked.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("falls back on the deterministic order for an unusable answer", () => {
    for (const raw of [null, {}, { classement: "oui" }, { classement: [1, 2] }]) {
      expect(readRerankResponse(raw, candidates).map((entry) => entry.id)).toEqual([
        "a",
        "b",
        "c",
      ]);
    }
  });

  it("trims a reason that runs long", () => {
    const ranked = readRerankResponse(
      { classement: [{ id: "a", raison: "x".repeat(500) }] },
      candidates,
    );

    expect(ranked[0]?.reason.length).toBeLessThanOrEqual(220);
  });
});

describe("buildRerankUserMessage", () => {
  it("sends what the candidate does, never who they are", () => {
    const message = buildRerankUserMessage(
      { headline: "Développeuse Full Stack", skills: ["TypeScript"], targetRoles: [] },
      toRerankCandidates([makeScored("a")]),
    );

    expect(message).toContain("Développeuse Full Stack");
    expect(message).toContain("TypeScript");
    expect(message).toContain("Poste a");
  });

  it("does not name an employer who chose to stay anonymous", () => {
    const anonymous = makeScored("a", {
      companyAnonymous: true,
      companyName: "Entreprise confidentielle",
    });
    const message = buildRerankUserMessage(
      { headline: "", skills: [], targetRoles: [] },
      toRerankCandidates([anonymous]),
    );

    expect(message).not.toContain("Entreprise confidentielle");
  });
});

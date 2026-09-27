import { describe, expect, it } from "vitest";
import { scoreAts } from "./engine";
import { makeDocument, makeExperience } from "./testing/make-document";
import { CRITICAL_CAPS, bandFor } from "./weights";

/** Perfect everywhere except the one defect each test introduces. */
function almostPerfect(overrides: Parameters<typeof makeDocument>[0] = {}) {
  return makeDocument({ wordCount: 600, ...overrides });
}

describe("critical findings cap the score", () => {
  it("leaves a flawless CV at full marks", () => {
    const result = scoreAts(almostPerfect());

    expect(result.overallScore).toBe(100);
    expect(result.cappedBy).toBeUndefined();
  });

  /**
   * The defect this whole mechanism exists for: a weighted mean let a
   * three-line CV lose four points overall, because length weighs on a single
   * dimension worth ten.
   */
  it("holds a skeletal CV down however good the rest is", () => {
    const result = scoreAts(almostPerfect({ wordCount: 40 }));

    expect(result.cappedBy).toBe("TOO_SHORT");
    expect(result.overallScore).toBeLessThanOrEqual(CRITICAL_CAPS.TOO_SHORT!);
    expect(result.band).toBe("weak");
  });

  it("does not cap a CV that is merely short", () => {
    // Between the skeletal floor and the comfortable minimum: a warning, not a
    // disqualification. (A real CV with two roles measures ~200 words.)
    const result = scoreAts(almostPerfect({ wordCount: 140 }));

    expect(result.cappedBy).toBeUndefined();
    expect(result.findings).toContainEqual({
      code: "TOO_SHORT",
      dimension: "formatHygiene",
      severity: "warning",
    });
  });

  it("caps a CV nobody can reply to", () => {
    const result = scoreAts(
      almostPerfect({
        contact: {
          city: true,
          email: false,
          linkedIn: true,
          phone: true,
          portfolio: true,
        },
      }),
    );

    expect(result.cappedBy).toBe("MISSING_EMAIL");
    expect(result.overallScore).toBeLessThanOrEqual(CRITICAL_CAPS.MISSING_EMAIL!);
  });

  it("caps a CV whose achievements carry no figures", () => {
    const result = scoreAts(
      almostPerfect({
        experiences: [
          makeExperience({
            bullets: [
              "Developpe la chaine TypeScript interne de bout en bout pour les equipes.",
              "Optimise les requetes PostgreSQL du rapport mensuel avec les analystes.",
            ],
          }),
        ],
      }),
    );

    expect(result.cappedBy).toBe("MISSING_QUANTIFICATION");
    expect(result.band).not.toBe("excellent");
  });

  /** The harshest ceiling wins; they do not stack or average. */
  it("applies the lowest cap when several critical findings fire", () => {
    const result = scoreAts(
      almostPerfect({
        contact: {
          city: false,
          email: false,
          linkedIn: false,
          phone: false,
          portfolio: false,
        },
        wordCount: 40,
      }),
    );

    expect(result.cappedBy).toBe("TOO_SHORT");
    expect(result.overallScore).toBeLessThanOrEqual(CRITICAL_CAPS.TOO_SHORT!);
  });

  /**
   * A cap never invents a better score: it only ever holds one down, so a CV
   * already scoring below the ceiling keeps its own number.
   */
  it("never raises a score that is already below the ceiling", () => {
    const weak = scoreAts(
      makeDocument({
        contact: {
          city: false,
          email: false,
          linkedIn: false,
          phone: false,
          portfolio: false,
        },
        experiences: [],
        rawText: "",
        sections: {
          certifications: false,
          education: false,
          experience: false,
          languages: false,
          skills: false,
          summary: false,
        },
        wordCount: 0,
      }),
    );

    expect(weak.overallScore).toBe(0);
  });

  it("reports no cap when nothing critical fired", () => {
    const result = scoreAts(
      almostPerfect({
        sections: {
          certifications: false,
          education: true,
          experience: true,
          languages: true,
          skills: true,
          summary: true,
        },
      }),
    );

    expect(result.cappedBy).toBeUndefined();
  });

  it("stays deterministic once capped", () => {
    const doc = almostPerfect({ wordCount: 40 });

    expect(scoreAts(doc)).toEqual(scoreAts(doc));
  });
});

describe("the ceilings themselves", () => {
  it("are all inside the score range", () => {
    for (const [code, cap] of Object.entries(CRITICAL_CAPS)) {
      expect(cap, code).toBeGreaterThan(0);
      expect(cap, code).toBeLessThan(100);
    }
  });

  /**
   * A ceiling at or above the "excellent" floor would not cap anything a
   * candidate would notice — it would be decoration.
   */
  it("all keep a capped CV out of the top band", () => {
    for (const [code, cap] of Object.entries(CRITICAL_CAPS)) {
      expect(bandFor(cap!), code).not.toBe("excellent");
    }
  });
});

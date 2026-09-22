import { describe, expect, it } from "vitest";
import { scoreAts } from "./engine";
import { makeDocument, makeExperience } from "./testing/make-document";
import { ATS_SCORE_ENGINE_VERSION, type AtsDimensionKey } from "./types";
import { ATS_DIMENSION_WEIGHTS } from "./weights";

function dimension(key: AtsDimensionKey, doc = makeDocument()) {
  const found = scoreAts(doc).dimensions.find((item) => item.key === key);

  if (!found) throw new Error(`dimension ${key} missing from the result`);

  return found;
}

describe("weights", () => {
  /**
   * A drift here moves every user's score at once, so it is asserted rather
   * than trusted.
   */
  it("sum to 100 across all dimensions", () => {
    const total = Object.values(ATS_DIMENSION_WEIGHTS).reduce(
      (sum, weight) => sum + weight,
      0,
    );

    expect(total).toBe(100);
  });
});

describe("scoreAts", () => {
  it("is deterministic: the same document scores identically twice", () => {
    const doc = makeDocument();

    expect(scoreAts(doc)).toEqual(scoreAts(doc));
  });

  it("stamps the engine version on every result", () => {
    expect(scoreAts(makeDocument()).engineVersion).toBe(
      ATS_SCORE_ENGINE_VERSION,
    );
  });

  it("scores a flawless CV at 100 on every implemented dimension", () => {
    const result = scoreAts(makeDocument());

    expect(result.overallScore).toBe(100);
    expect(result.band).toBe("excellent");
    expect(result.findings).toEqual([]);
  });

  it("keeps the score within 0-100 for an empty document", () => {
    const result = scoreAts(
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

    expect(result.overallScore).toBe(0);
    expect(result.band).toBe("weak");
  });

  it("reports the model as not applied while impact is unavailable", () => {
    expect(scoreAts(makeDocument()).llmApplied).toBe(false);
  });

  it("orders findings worst-first so the free tier can show the top ones", () => {
    const result = scoreAts(
      makeDocument({
        contact: {
          city: false,
          email: false,
          linkedIn: false,
          phone: true,
          portfolio: true,
        },
      }),
    );

    expect(result.findings[0]?.severity).toBe("critical");
    expect(result.findings.at(-1)?.severity).toBe("info");
  });
});

describe("renormalisation", () => {
  /**
   * The rule that lets one scale serve both surfaces: a dimension nobody could
   * observe is excluded, never scored zero.
   */
  it("excludes unavailable dimensions instead of scoring them zero", () => {
    const result = scoreAts(makeDocument());

    const unavailable = result.dimensions.filter(
      (item) => item.status === "unavailable",
    );

    expect(unavailable.length).toBeGreaterThan(0);
    expect(unavailable.every((item) => item.score === null)).toBe(true);
    // Zero-scored dimensions would have dragged a perfect CV below 100.
    expect(result.overallScore).toBe(100);
  });

  it("marks keywords unavailable for want of an offer", () => {
    expect(dimension("keywords").unavailableReason).toBe("NO_OFFER");
  });

  it("exposes every declared dimension, scored or not", () => {
    expect(scoreAts(makeDocument()).dimensions).toHaveLength(
      Object.keys(ATS_DIMENSION_WEIGHTS).length,
    );
  });
});

describe("structure", () => {
  it("drops when the experience section is missing", () => {
    const withExperience = dimension("structure").score ?? 0;
    const without =
      dimension(
        "structure",
        makeDocument({
          sections: {
            certifications: true,
            education: true,
            experience: false,
            languages: true,
            skills: true,
            summary: true,
          },
        }),
      ).score ?? 0;

    expect(without).toBeLessThan(withExperience);
  });

  it("penalises experiences listed oldest-first", () => {
    const outOfOrder = dimension(
      "structure",
      makeDocument({
        experiences: [
          makeExperience({ endDate: "12/2019", startDate: "03/2017" }),
          makeExperience({ endDate: "present", startDate: "01/2022" }),
        ],
      }),
    ).score;

    expect(outOfOrder).toBeLessThan(100);
  });

  it("does not penalise chronology it cannot read", () => {
    const undated = dimension(
      "structure",
      makeDocument({
        experiences: [
          makeExperience({ endDate: "", startDate: "" }),
          makeExperience({ endDate: "", startDate: "" }),
        ],
      }),
    ).score;

    expect(undated).toBe(100);
  });
});

describe("contactability", () => {
  it("bottoms out when no way to reach the candidate is present", () => {
    const result = dimension(
      "contactability",
      makeDocument({
        contact: {
          city: false,
          email: false,
          linkedIn: false,
          phone: false,
          portfolio: false,
        },
      }),
    );

    expect(result.score).toBe(0);
  });

  it("never lowers the score when a channel is added", () => {
    const withoutEmail = dimension(
      "contactability",
      makeDocument({
        contact: {
          city: true,
          email: false,
          linkedIn: true,
          phone: true,
          portfolio: true,
        },
      }),
    ).score;

    expect(dimension("contactability").score).toBeGreaterThan(
      withoutEmail ?? 0,
    );
  });

  it("flags a missing email as critical", () => {
    const result = scoreAts(
      makeDocument({
        contact: {
          city: true,
          email: false,
          linkedIn: true,
          phone: true,
          portfolio: true,
        },
      }),
    );

    expect(result.findings).toContainEqual({
      code: "MISSING_EMAIL",
      dimension: "contactability",
      severity: "critical",
    });
  });
});

describe("formatHygiene", () => {
  it("treats an ongoing role as a valid end date", () => {
    expect(dimension("formatHygiene").score).toBe(100);
  });

  it("flags dates it cannot parse", () => {
    const result = scoreAts(
      makeDocument({
        experiences: [makeExperience({ endDate: "hier", startDate: "jadis" })],
      }),
    );

    expect(result.findings.map((finding) => finding.code)).toContain(
      "UNPARSABLE_DATES",
    );
  });

  it("flags mixed date formats without calling them unparsable", () => {
    const codes = scoreAts(
      makeDocument({
        experiences: [
          makeExperience({ endDate: "present", startDate: "01/2022" }),
          makeExperience({ endDate: "2021-12", startDate: "2019-03" }),
        ],
      }),
    ).findings.map((finding) => finding.code);

    expect(codes).toContain("INCONSISTENT_DATE_FORMATS");
    expect(codes).not.toContain("UNPARSABLE_DATES");
  });

  it("detects table scaffolding left by the extractor", () => {
    const codes = scoreAts(
      makeDocument({
        rawText: [
          "Compétence | Niveau | Années",
          "TypeScript | Expert | 8",
          "PostgreSQL | Avancé | 6",
        ].join("\n"),
      }),
    ).findings.map((finding) => finding.code);

    expect(codes).toContain("TABLE_MARKERS");
  });

  /**
   * "email | téléphone | ville" is one of the most common CV headers there is,
   * and perfectly readable — a table is scaffolding repeated row after row.
   */
  it("does not mistake a single separated contact line for a table", () => {
    const codes = scoreAts(
      makeDocument({ rawText: "alex@example.com | 06 12 34 56 78 | Lyon" }),
    ).findings.map((finding) => finding.code);

    expect(codes).not.toContain("TABLE_MARKERS");
  });

  it("detects a grid dense enough to sit on one line", () => {
    const codes = scoreAts(
      makeDocument({ rawText: "A | B | C | D" }),
    ).findings.map((finding) => finding.code);

    expect(codes).toContain("TABLE_MARKERS");
  });

  it("flags a CV too short to say anything", () => {
    const codes = scoreAts(makeDocument({ wordCount: 120 })).findings.map(
      (finding) => finding.code,
    );

    expect(codes).toContain("TOO_SHORT");
  });

  it("flags a CV that dumps an entire career", () => {
    const codes = scoreAts(makeDocument({ wordCount: 2400 })).findings.map(
      (finding) => finding.code,
    );

    expect(codes).toContain("TOO_LONG");
  });

  it("flags experiences without bullets", () => {
    const codes = scoreAts(
      makeDocument({
        experiences: [
          makeExperience({ bullets: [] }),
          makeExperience({ bullets: [] }),
        ],
      }),
    ).findings.map((finding) => finding.code);

    expect(codes).toContain("FEW_BULLETS");
  });
});

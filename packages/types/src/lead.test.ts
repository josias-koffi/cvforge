import { describe, expect, it } from "vitest";
import { LEAD_OFFER_TEXT_MAX, leadIntentPath, parseLeadIntent } from "./lead";

const SCAN_ID = "3f2b8c1e-5d4a-4b6f-9a8e-1c2d3e4f5a6b";

describe("parseLeadIntent", () => {
  it.each([
    [
      { kind: "ats_scan", scanId: SCAN_ID },
      { kind: "ats_scan", scanId: SCAN_ID },
    ],
    [
      { kind: "offer", offerText: "  Développeur  " },
      { kind: "offer", offerText: "Développeur" },
    ],
    [
      { department: "2a", kind: "job_search", romeCode: "m1805" },
      { department: "2A", kind: "job_search", romeCode: "M1805" },
    ],
    [
      { kind: "company", siren: "552100554" },
      { kind: "company", siren: "552100554" },
    ],
  ])("accepts %j", (raw, expected) => {
    expect(parseLeadIntent(raw)).toEqual(expected);
  });

  it.each([
    ["nothing", undefined],
    ["a string", "ats_scan"],
    ["an unknown kind", { kind: "cv", text: "..." }],
    ["a scan id that is not a uuid", { kind: "ats_scan", scanId: "1" }],
    ["an empty offer", { kind: "offer", offerText: "   " }],
    [
      "an oversized offer",
      { kind: "offer", offerText: "x".repeat(LEAD_OFFER_TEXT_MAX + 1) },
    ],
    [
      "a bad ROME code",
      { department: "75", kind: "job_search", romeCode: "1805" },
    ],
    [
      "a bad department",
      { department: "750", kind: "job_search", romeCode: "M1805" },
    ],
    [
      "a SIRET instead of a SIREN",
      { kind: "company", siren: "55210055400013" },
    ],
  ])("refuses %s", (_label, raw) => {
    expect(parseLeadIntent(raw)).toBeNull();
  });

  /** Only the checked fields survive: nothing else reaches the database. */
  it("drops any field it does not know", () => {
    expect(
      parseLeadIntent({
        cvText: "Jean Dupont",
        kind: "ats_scan",
        scanId: SCAN_ID,
      }),
    ).toEqual({ kind: "ats_scan", scanId: SCAN_ID });
  });
});

describe("leadIntentPath", () => {
  it("opens the ATS report of the scan", () => {
    expect(leadIntentPath({ kind: "ats_scan", scanId: SCAN_ID })).toBe(
      `/analyses-ats/${SCAN_ID}`,
    );
  });

  it("opens the applications, where the offer's one now sits", () => {
    expect(leadIntentPath({ kind: "offer", offerText: "Un poste" })).toBe(
      "/candidatures",
    );
  });

  it("keeps the default screen for tools that have none yet", () => {
    expect(leadIntentPath({ kind: "company", siren: "552100554" })).toBeNull();
  });
});

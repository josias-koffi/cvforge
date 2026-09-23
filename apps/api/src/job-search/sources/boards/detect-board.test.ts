import { describe, expect, it } from "vitest";
import { detectAtsBoard } from "./detect-board";

describe("detectAtsBoard", () => {
  it.each([
    ["https://boards.greenhouse.io/acme/jobs/4212345", "greenhouse", "acme"],
    ["https://job-boards.greenhouse.io/doctolib/jobs/7583949003", "greenhouse", "doctolib"],
    ["https://boards.greenhouse.io/embed/job_app?for=acme&token=42", "greenhouse", "acme"],
    ["https://jobs.lever.co/swile/8f2c-4f7a", "lever", "swile"],
    ["https://jobs.ashbyhq.com/ledger/43549294-9772", "ashby", "ledger"],
    ["https://careers.smartrecruiters.com/Sodexo/744000151238125", "smartrecruiters", "Sodexo"],
    ["https://apply.workable.com/gorgias/j/ABC123/", "workable", "gorgias"],
    ["https://acme.workable.com/jobs/12345", "workable", "acme"],
    ["https://alan.recruitee.com/o/developpeur-full-stack", "recruitee", "alan"],
    ["https://acme.jobs.personio.de/job/123456", "personio", "acme"],
    ["https://www.welcomekit.co/acme/jobs/dev-full-stack", "welcomekit", "acme"],
  ])("reads %s", (url, provider, boardToken) => {
    expect(detectAtsBoard(url)).toEqual({ boardToken, provider });
  });

  it("ignores anything that is not an applicant tracking system", () => {
    for (const url of [
      "https://candidat.francetravail.fr/offres/recherche/detail/184XYZQ",
      "https://www.welcometothejungle.com/fr/companies/acme/jobs/dev",
      "https://www.linkedin.com/jobs/view/123456",
      "https://acme.com/careers",
      "",
      "pas une url",
    ]) {
      expect(detectAtsBoard(url)).toBeNull();
    }
  });

  it("refuses a board URL with no company in it", () => {
    expect(detectAtsBoard("https://boards.greenhouse.io/")).toBeNull();
    expect(detectAtsBoard("https://jobs.lever.co")).toBeNull();
  });

  it("accepts a URL without its scheme", () => {
    expect(detectAtsBoard("jobs.lever.co/swile/8f2c")).toEqual({
      boardToken: "swile",
      provider: "lever",
    });
  });
});

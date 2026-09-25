import { describe, expect, it } from "vitest";
import { careersPage, readBoardDetails } from "./boards.details";
import type { ListingForDetails } from "../../offer-details.types";

function listing(overrides: Partial<ListingForDetails>): ListingForDetails {
  return {
    applyUrl: "",
    companyAnonymous: false,
    raw: {},
    source: "lever",
    url: "",
    ...overrides,
  };
}

describe("careersPage", () => {
  it("finds the company's page on each hosted board", () => {
    expect(careersPage("https://jobs.lever.co/agicap/0f62c5e1")).toBe(
      "https://jobs.lever.co/agicap",
    );
    expect(careersPage("https://jobs.ashbyhq.com/cursor/88d4")).toBe(
      "https://jobs.ashbyhq.com/cursor",
    );
    expect(careersPage("https://boards.greenhouse.io/doctolib/jobs/5")).toBe(
      "https://job-boards.greenhouse.io/doctolib",
    );
    expect(
      careersPage("https://jobs.smartrecruiters.com/Sodexo/7440-grounds"),
    ).toBe("https://careers.smartrecruiters.com/Sodexo");
  });

  it("points a board embedded in a careers site to that site", () => {
    expect(careersPage("https://careers.acme.com/jobs?gh_jid=4")).toBe(
      "https://careers.acme.com",
    );
  });

  it("gives nothing for a missing or odd link", () => {
    expect(careersPage("")).toBe("");
    expect(careersPage("javascript:alert(1)")).toBe("");
  });
});

describe("readBoardDetails", () => {
  it("reads a Lever posting: team, pay and the parts kept apart", () => {
    const details = readBoardDetails(
      listing({
        applyUrl: "https://jobs.lever.co/agicap/1/apply",
        raw: {
          categories: {
            commitment: "Permanent",
            department: "Sales",
            team: "AE",
          },
          lists: [
            {
              content: "<ul><li>5 years in B2B sales</li></ul>",
              text: "What we are looking for:",
            },
            { content: "", text: "Empty" },
          ],
          salaryRange: {
            currency: "EUR",
            interval: "per-year-salary",
            max: 150000,
            min: 100000,
          },
          workplaceType: "hybrid",
        },
        url: "https://jobs.lever.co/agicap/1",
      }),
    );

    expect(details).toMatchObject({
      apply: { host: "jobs.lever.co", target: "employer" },
      companyWebsite: "https://jobs.lever.co/agicap",
      sections: [
        { text: "5 years in B2B sales", title: "What we are looking for" },
      ],
      source: "lever",
    });
    expect(details.facts.map((fact) => fact.label)).toEqual([
      "Contrat",
      "Mode de travail",
      "Service",
      "Équipe",
    ]);
    expect(details.salary?.label).toMatch(/^100\s000\s€ – 150\s000\s€ par an$/);
  });

  it("reads an Ashby job's contract and pay", () => {
    const details = readBoardDetails(
      listing({
        raw: {
          compensation: { compensationTierSummary: "€60K – €80K" },
          employmentType: "FullTime",
        },
        source: "ashby",
      }),
    );

    expect(details.facts).toEqual([{ label: "Contrat", value: "Temps plein" }]);
    expect(details.salary).toEqual({
      benefits: [],
      comment: "",
      label: "€60K – €80K",
    });
  });

  it("drops SmartRecruiters' placeholder labels", () => {
    const details = readBoardDetails(
      listing({
        raw: {
          experienceLevel: { label: "Mid-Senior Level" },
          function: { label: "Other" },
          location: { hybrid: true },
        },
        source: "smartrecruiters",
      }),
    );

    expect(details.facts).toEqual([
      { label: "Mode de travail", value: "Hybride" },
      { label: "Niveau", value: "Mid-Senior Level" },
    ]);
  });
});

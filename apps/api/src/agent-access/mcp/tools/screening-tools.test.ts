import { describe, expect, it, vi } from "vitest";
import type { McpToolDefinition } from "../mcp-tool";
import { screeningTools, type ScreeningToolsDeps } from "./screening-tools";

const ctx = { principal: { userEmail: "ana@example.com" } } as never;

function setup() {
  const deps = {
    answers: {
      get: vi.fn(async () => ({
        custom: [{ answer: "Oui", question: "Permis B ?", updatedAt: "x" }],
        known: { noticePeriod: "1 mois" },
        updatedAt: "x",
      })),
      saveOne: vi.fn(),
    },
    profiles: {
      getRegistry: vi.fn(async () => ({
        activeProfileId: "p1",
        profiles: [
          {
            id: "p1",
            identity: {
              city: "Nantes",
              drivingLicenses: ["B"],
              links: [{ label: "LinkedIn", url: "https://linkedin.com/in/x" }],
            },
            preferences: {
              availabilityDate: "",
              availabilityMode: "immediate",
              contractTypes: "CDI",
            },
            sections: {
              experiences: [
                { company: "Old", role: "Dev" },
                { company: "Acme", current: true, role: "Lead" },
              ],
              languages: [{ language: "Anglais", level: "C1" }],
            },
          },
        ],
      })),
    },
  } as unknown as ScreeningToolsDeps;
  const tools = Object.fromEntries(
    screeningTools(deps).map((tool) => [tool.name, tool]),
  ) as Record<string, McpToolDefinition>;
  return { deps, tools };
}

describe("screening tools", () => {
  it("gives saved answers, what is missing and what the profile answers", async () => {
    const { tools } = setup();
    const result = await tools.get_screening_answers.run({}, ctx);

    expect(result).toMatchObject({
      custom: [{ answer: "Oui", question: "Permis B ?" }],
      fromProfile: {
        availability: "Immédiate",
        city: "Nantes",
        contractTypes: "CDI",
        currentCompany: "Acme",
        currentRole: "Lead",
        drivingLicenses: ["B"],
      },
      known: [{ answer: "1 mois", key: "noticePeriod", label: "Préavis" }],
    });
    expect((result as { missing: string[] }).missing).toContain(
      "salaryExpectation",
    );
    expect(tools.get_screening_answers.scopes).toEqual(["profile:read"]);
  });

  it("saves one answer under its own scope, by key or by question", async () => {
    const { deps, tools } = setup();
    await tools.save_screening_answer.run(
      { answer: "45 k€", key: "salaryExpectation" },
      ctx,
    );
    expect(deps.answers.saveOne).toHaveBeenCalledWith("ana@example.com", {
      answer: "45 k€",
      key: "salaryExpectation",
    });
    expect(tools.save_screening_answer.scopes).toEqual(["answers:write"]);

    await expect(
      tools.save_screening_answer.run({ answer: "x" }, ctx),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("reads no facts when there is no profile", async () => {
    const { deps, tools } = setup();
    vi.mocked(deps.profiles.getRegistry).mockResolvedValueOnce(null);
    expect(await tools.get_screening_answers.run({}, ctx)).toMatchObject({
      fromProfile: null,
    });
  });
});

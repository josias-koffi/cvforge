import { describe, expect, it, vi } from "vitest";
import type { McpToolDefinition } from "../mcp-tool";
import {
  applicationTools,
  type ApplicationToolsDeps,
} from "./application-tools";

const ctx = {
  principal: {
    scopes: new Set<never>(),
    tokenId: "t",
    userEmail: "user@example.com",
  },
};

const profile = {
  headline: "Dev ",
  id: "p2",
  identity: {
    city: "Nantes",
    drivingLicenses: ["B"],
    email: "user@example.com",
    firstName: "Ana",
    lastName: "Martin",
    links: [],
    phone: "0600000000",
  },
  preferences: {
    availabilityDate: "",
    availabilityMode: "",
    contractTypes: "",
  },
  sections: { experiences: [] },
};

function setup(
  overrides: Partial<Record<keyof ApplicationToolsDeps, unknown>> = {},
) {
  const deps = {
    applications: {
      getApplicationForUser: vi.fn(async () => ({
        id: "app-1",
        profileId: "p2",
      })),
      importFromText: vi.fn(),
      importFromUrl: vi.fn(),
      updateStatus: vi.fn(),
    },
    credits: { getBalanceSummaryForUser: vi.fn(async () => ({ balance: 7 })) },
    documents: {
      generateCv: vi.fn(async () => ({ sections: [] })),
      generateLetter: vi.fn(),
    },
    jobs: { applyToJob: vi.fn() },
    profiles: {
      getRegistry: vi.fn(async () => ({
        activeProfileId: "p1",
        profiles: [profile],
      })),
    },
    signedFiles: {
      issue: vi.fn(() => ({ expiresAt: "x", url: "https://api/mcp/files/t" })),
    },
    ...overrides,
  } as unknown as ApplicationToolsDeps;
  const tools = Object.fromEntries(
    applicationTools(deps).map((tool) => [tool.name, tool]),
  ) as Record<string, McpToolDefinition>;

  return { deps, tools };
}

describe("application tools", () => {
  it("generates the CV from the application's profile, pseudonymised", async () => {
    const { deps, tools } = setup();

    const result = await tools.generate_cv.run({ applicationId: "app-1" }, ctx);

    const request = vi.mocked(deps.documents.generateCv).mock.calls[0][2];
    expect(request.profileId).toBe("p2");
    expect(request.promptProfile.identity.candidateToken).toBe("[CANDIDATE]");
    expect(JSON.stringify(request.promptProfile)).not.toContain("Martin");
    expect(request.localFields.lastName).toBe("Martin");
    expect(result).toMatchObject({ balanceAfter: 7, creditsSpent: 3 });
    expect(tools.generate_cv.cost?.({})).toBe(3);
  });

  it("reports no spending when the offer was already applied to", async () => {
    const { deps, tools } = setup();
    vi.mocked(deps.jobs.applyToJob).mockResolvedValue({
      applicationId: "app-1",
      existing: true,
      outcome: "applied",
    });

    expect(await tools.apply_to_offer.run({ jobId: "j1" }, ctx)).toMatchObject({
      creditsSpent: 0,
      existing: true,
    });
  });

  it("maps a closed offer to 410 and needs exactly one of URL or text", async () => {
    const { deps, tools } = setup();
    vi.mocked(deps.jobs.applyToJob).mockResolvedValue({ outcome: "closed" });

    await expect(
      tools.apply_to_offer.run({ jobId: "j1" }, ctx),
    ).rejects.toMatchObject({
      status: 410,
    });
    await expect(tools.import_offer.run({}, ctx)).rejects.toMatchObject({
      status: 422,
    });
  });

  it("signs a download link only for the user's own application", async () => {
    const { deps, tools } = setup();
    vi.mocked(deps.applications.getApplicationForUser).mockRejectedValueOnce(
      new Error("not yours"),
    );

    await expect(
      tools.get_document_download_url.run(
        { applicationId: "other", kind: "cv" },
        ctx,
      ),
    ).rejects.toThrow();
    expect(deps.signedFiles.issue).not.toHaveBeenCalled();

    await tools.get_document_download_url.run(
      { applicationId: "app-1", kind: "letter" },
      ctx,
    );
    expect(deps.signedFiles.issue).toHaveBeenCalledWith({
      applicationId: "app-1",
      format: "pdf",
      kind: "letter",
      userEmail: "user@example.com",
    });
  });
});

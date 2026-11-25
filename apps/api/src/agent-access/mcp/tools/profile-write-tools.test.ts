import { describe, expect, it, vi } from "vitest";
import type {
  StoredProfile,
  StoredProfileRegistry,
} from "../../../profiles/profiles.types";
import type { McpToolDefinition } from "../mcp-tool";
import { profileWriteTools } from "./profile-write-tools";

const SAVED_AT = "2026-11-20T10:00:00.000Z";
const NOW = new Date("2026-11-25T10:00:00.000Z");
const ctx = {
  principal: {
    scopes: new Set<never>(),
    tokenId: "t",
    userEmail: "user@example.com",
  },
};

function makeRegistry(): StoredProfileRegistry {
  const profile = {
    headline: "Développeur",
    id: "p1",
    identity: {
      email: "user@example.com",
      firstName: "Ana",
      lastName: "B",
      phone: "06",
    },
    label: "Principal",
    meta: { lastSavedAt: SAVED_AT, maxProfiles: null, source: "storage" },
    sections: {
      experiences: [
        {
          company: "Acme",
          period: "2021 – 2024",
          results: "Maintenance",
          role: "Dev",
        },
      ],
      summary: "Ancien résumé",
      technicalSkills: ["TypeScript"],
    },
  } as unknown as StoredProfile;

  return {
    activeProfileId: "p1",
    profiles: [profile],
    userEmail: "user@example.com",
    version: 2,
  };
}

function setup() {
  const profiles = {
    getRegistry: vi.fn(async () => makeRegistry()),
    saveRegistry: vi.fn(
      async (_email: string, registry: StoredProfileRegistry) => registry,
    ),
  };
  const tools = Object.fromEntries(
    profileWriteTools({ now: () => NOW, profiles }).map((tool) => [
      tool.name,
      tool,
    ]),
  ) as Record<string, McpToolDefinition>;
  const saved = () => profiles.saveRegistry.mock.calls[0]?.[1].profiles[0];

  return { profiles, saved, tools };
}

const guard = { expectedLastSavedAt: SAVED_AT, profileId: "p1" };

describe("profile write tools", () => {
  it("updates only the given fields of one experience and stamps the save", async () => {
    const { saved, tools } = setup();

    const result = await tools.update_experience.run(
      {
        ...guard,
        changes: { results: "Réduit le temps de build de 40 %" },
        index: 0,
      },
      ctx,
    );

    expect(saved().sections.experiences[0]).toEqual({
      company: "Acme",
      period: "2021 – 2024",
      results: "Réduit le temps de build de 40 %",
      role: "Dev",
    });
    expect(saved().meta.lastSavedAt).toBe(NOW.toISOString());
    expect(result).toMatchObject({ lastSavedAt: NOW.toISOString() });
  });

  it("refuses when the profile changed since the agent read it", async () => {
    const { profiles, tools } = setup();

    await expect(
      tools.update_experience.run(
        {
          ...guard,
          changes: { role: "Lead" },
          expectedLastSavedAt: "2026-01-01T00:00:00.000Z",
          index: 0,
        },
        ctx,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(profiles.saveRegistry).not.toHaveBeenCalled();
  });

  it("refuses an unknown profile or experience position", async () => {
    const { tools } = setup();

    await expect(
      tools.remove_experience.run(
        { ...guard, profileId: "nope", index: 0 },
        ctx,
      ),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      tools.remove_experience.run({ ...guard, index: 3 }, ctx),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it("adds an experience first and replaces only the sections provided", async () => {
    const { saved, tools } = setup();

    await tools.add_experience.run(
      {
        ...guard,
        experience: {
          company: "Beta",
          period: "2024",
          results: "x",
          role: "Lead",
        },
      },
      ctx,
    );
    expect(
      saved().sections.experiences.map((e: { company: string }) => e.company),
    ).toEqual(["Beta", "Acme"]);

    const second = setup();
    await second.tools.update_profile_sections.run(
      { ...guard, headline: "Lead dev", summary: "Nouveau" },
      ctx,
    );
    expect(second.saved()).toMatchObject({
      headline: "Lead dev",
      identity: { lastName: "B", phone: "06" },
      sections: { summary: "Nouveau", technicalSkills: ["TypeScript"] },
    });
  });
});
